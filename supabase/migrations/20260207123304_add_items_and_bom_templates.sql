/*
  # Add Items and BOM Templates System

  1. New Tables
    - `items` - Master items/products catalog
      - `id` (uuid, primary key)
      - `tenant_id` (uuid, foreign key)
      - `item_type` (text) - 'product' or 'service'
      - `item_name` (text)
      - `category` (text)
      - `description` (text)
      - `specifications` (text)
      - `sales_price` (numeric)
      - `tax_rate` (numeric)
      - `measuring_unit` (text)
      - `opening_stock` (numeric)
      - `show_in_online_store` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `bom_templates` - Bill of Materials templates
      - `id` (uuid, primary key)
      - `tenant_id` (uuid, foreign key)
      - `template_name` (text)
      - `is_default` (boolean)
      - `items` (jsonb) - Array of BOM items
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add tenant isolation policies
*/

-- Create items table
CREATE TABLE IF NOT EXISTS items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  item_type text NOT NULL DEFAULT 'product',
  item_name text NOT NULL,
  category text,
  description text,
  specifications text,
  sales_price numeric(12, 2) DEFAULT 0,
  tax_rate numeric(5, 2) DEFAULT 0,
  measuring_unit text DEFAULT 'PCS',
  opening_stock numeric(12, 2) DEFAULT 0,
  show_in_online_store boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create bom_templates table
CREATE TABLE IF NOT EXISTS bom_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_name text NOT NULL,
  is_default boolean DEFAULT false,
  items jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bom_templates ENABLE ROW LEVEL SECURITY;

-- Items policies
CREATE POLICY "Users can view items in their tenant"
  ON items FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert items in their tenant"
  ON items FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update items in their tenant"
  ON items FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete items in their tenant"
  ON items FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- BOM templates policies
CREATE POLICY "Users can view BOM templates in their tenant"
  ON bom_templates FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert BOM templates in their tenant"
  ON bom_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update BOM templates in their tenant"
  ON bom_templates FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete BOM templates in their tenant"
  ON bom_templates FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_items_tenant_id ON items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_items_item_type ON items(item_type);
CREATE INDEX IF NOT EXISTS idx_bom_templates_tenant_id ON bom_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bom_templates_is_default ON bom_templates(is_default);