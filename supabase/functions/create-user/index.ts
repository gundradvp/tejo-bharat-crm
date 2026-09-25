import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');

    if (!serviceRoleKey || !supabaseUrl) {
      console.error('Missing environment variables');
      throw new Error('Server configuration error');
    }

    const supabaseClient = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      console.error('Auth error:', userError);
      throw new Error('Unauthorized');
    }

    console.log('Authenticated user:', user.id);

    const { data: profile, error: profileFetchError } = await supabaseClient
      .from('profiles')
      .select('role, tenant_id')
      .eq('id', user.id)
      .single();

    if (profileFetchError) {
      console.error('Profile fetch error:', profileFetchError);
      throw new Error(`Profile not found: ${profileFetchError.message}`);
    }

    if (!profile) {
      throw new Error('Profile not found');
    }

    const { data: userRolesData } = await supabaseClient
      .from('user_roles')
      .select('role_id, roles(name)')
      .eq('user_id', user.id);

    const userRoles = userRolesData?.map((ur: any) => ur.roles.name) || [];

    const { data: superAdminCheck } = await supabaseClient
      .from('super_admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();

    const isSuperAdmin = !!superAdminCheck;
    const isAdmin = profile.role === 'admin' || userRoles.includes('admin');

    console.log('User auth check:', { userId: user.id, isAdmin, isSuperAdmin, profileRole: profile.role, userRoles });

    const { email, password, full_name, phone, roles, tenantId } = await req.json();

    console.log('Request data:', { email, full_name, roles, tenantId, profileTenantId: profile.tenant_id });

    if (!email || !password || !full_name || !roles || !Array.isArray(roles) || roles.length === 0) {
      throw new Error('Missing required fields or invalid roles');
    }

    const actualTenantId = tenantId || profile.tenant_id;

    if (!actualTenantId) {
      throw new Error('Tenant ID is required');
    }

    if (tenantId && tenantId !== profile.tenant_id) {
      if (!isSuperAdmin) {
        throw new Error('Only super admins can create users for other tenants');
      }
    } else {
      if (!isAdmin) {
        throw new Error('Only admins can create users');
      }
    }

    if (actualTenantId) {
      const { data: license } = await supabaseClient
        .from('tenant_licenses')
        .select('max_users')
        .eq('tenant_id', actualTenantId)
        .maybeSingle();

      const { data: usage } = await supabaseClient
        .from('tenant_usage')
        .select('current_users')
        .eq('tenant_id', actualTenantId)
        .maybeSingle();

      console.log('License check:', { license, usage });

      if (license && usage && usage.current_users >= license.max_users) {
        throw new Error('User limit reached. Cannot create more users.');
      }
    }

    console.log('Creating auth user...');
    const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        roles,
      },
    });

    if (authError) {
      console.error('Auth creation error:', authError);
      throw new Error(`Failed to create auth user: ${authError.message}`);
    }
    if (!authData.user) {
      throw new Error('Failed to create user - no user data returned');
    }

    console.log('Auth user created:', authData.user.id);

    console.log('Creating profile...');
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .insert({
        id: authData.user.id,
        email,
        full_name,
        phone: phone || null,
        role: roles[0],
        is_active: true,
        tenant_id: actualTenantId,
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      await supabaseClient.auth.admin.deleteUser(authData.user.id);
      throw new Error(`Failed to create profile: ${profileError.message} (Code: ${profileError.code})`);
    }

    console.log('Profile created');

    console.log('Fetching roles...');
    const { data: rolesData, error: rolesError } = await supabaseClient
      .from('roles')
      .select('id, name')
      .in('name', roles);

    if (rolesError) {
      console.error('Roles fetch error:', rolesError);
      throw new Error(`Failed to fetch roles: ${rolesError.message}`);
    }

    console.log('Roles fetched:', rolesData);

    if (rolesData && rolesData.length > 0) {
      const userRoles = rolesData.map(role => ({
        user_id: authData.user.id,
        role_id: role.id,
      }));

      console.log('Inserting user roles:', userRoles);

      const { error: userRolesError } = await supabaseClient
        .from('user_roles')
        .insert(userRoles);

      if (userRolesError) {
        console.error('Failed to insert user roles:', userRolesError);
      } else {
        console.log('User roles inserted successfully');
      }
    }

    if (actualTenantId) {
      const { data: currentUsage } = await supabaseClient
        .from('tenant_usage')
        .select('current_users')
        .eq('tenant_id', actualTenantId)
        .maybeSingle();

      if (currentUsage) {
        await supabaseClient
          .from('tenant_usage')
          .update({ current_users: currentUsage.current_users + 1 })
          .eq('tenant_id', actualTenantId);
        console.log('Tenant usage updated');
      }
    }

    console.log('User created successfully:', authData.user.id);

    return new Response(
      JSON.stringify({
        success: true,
        user_id: authData.user.id,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Error creating user:', error);
    console.error('Error stack:', error.stack);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to create user',
        details: error.stack,
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
