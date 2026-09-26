import { useState } from 'react';
import { FileText, Download, ChevronDown, ChevronRight, Search, X } from 'lucide-react';

interface DocSection {
  id: string;
  title: string;
  icon: string;
  content: DocContentBlock[];
  subsections?: DocSection[];
}

interface DocContentBlock {
  type: 'paragraph' | 'list' | 'steps' | 'note' | 'table';
  text?: string;
  items?: string[];
  steps?: string[];
  noteType?: 'info' | 'warning' | 'tip';
  headers?: string[];
  rows?: string[][];
}

const DOCUMENTATION_DATA: DocSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: 'Home',
    content: [
      {
        type: 'paragraph',
        text: 'Welcome to the Solar Customer Management System. This guide covers everything you need to know to use the application effectively. You can read it on screen or download it as a PDF for offline reference.',
      },
      {
        type: 'steps',
        steps: [
          'Open the application in your web browser or from your installed app.',
          'Enter your email address and password on the login screen.',
          'Click "Sign In" to access your dashboard.',
          'If you forgot your password, click "Forgot Password" on the login screen to reset it.',
        ],
      },
      {
        type: 'note',
        noteType: 'info',
        text: 'Your dashboard view depends on your assigned role. Admins see the full system, employees see assigned tasks and customers, finance users see financial dashboards, and lead generators see lead-related features.',
      },
    ],
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: 'Home',
    content: [
      { type: 'paragraph', text: 'The dashboard is your home screen after logging in. It shows a summary of your key metrics at a glance.' },
      {
        type: 'list',
        items: [
          'Total customers and their status breakdown',
          'Active tasks and pending items',
          'Financial summaries (for admin and finance roles)',
          'Recent activity feed',
          'Quick access buttons to common actions',
        ],
      },
    ],
  },
  {
    id: 'customers',
    title: 'Customer Management',
    icon: 'Users',
    content: [
      { type: 'paragraph', text: 'The Customers page is where you manage all your solar customers. You can add customers manually, import them in bulk, track their project progress, and manage their finances.' },
      {
        type: 'steps',
        steps: [
          'Click "Customers" in the navigation bar to see the full customer list.',
          'Use the search bar to find customers by name, phone, or application number.',
          'Use the filter dropdowns to narrow by status, assigned agent, DISCOM, workflow stage, import source, or lifecycle status.',
          'Click any customer card to view their full profile and project details.',
        ],
      },
    ],
    subsections: [
      {
        id: 'adding-customers',
        title: 'Adding Customers Manually',
        icon: 'Plus',
        content: [
          { type: 'paragraph', text: 'You can add customers one at a time using the customer form.' },
          {
            type: 'steps',
            steps: [
              'Click the "Add Customer" button on the Customers page.',
              'Fill in the customer details: name, phone number, address, DISCOM, and district.',
              'Select the appropriate loan, document, installation, and subsidy statuses.',
              'Click "Save" to create the customer record.',
            ],
          },
          {
            type: 'note',
            noteType: 'info',
            text: 'Manually added customers are tagged with a "Manual" badge so you can always tell them apart from imported ones.',
          },
        ],
      },
      {
        id: 'bulk-import',
        title: 'Importing Customers from PM Surya Ghar',
        icon: 'Upload',
        content: [
          { type: 'paragraph', text: 'You can import multiple customers at once from a PM Surya Ghar JSON or CSV file. This is the fastest way to bring in large lists of customers.' },
          {
            type: 'steps',
            steps: [
              'Go to the Customers page and click "Import".',
              'Upload your JSON or CSV file exported from the PM Surya Ghar portal.',
              'The system will create new customers and update existing ones automatically.',
              'After import, you will see a summary showing how many were created, updated, and marked as lost.',
            ],
          },
          {
            type: 'note',
            noteType: 'warning',
            text: 'After each import, the system automatically checks which previously imported customers are NOT in the latest file. These customers are marked as "Lost/Churned" because they may have chosen another vendor. If a lost customer reappears in a future import, they are automatically restored to active status.',
          },
          {
            type: 'note',
            noteType: 'info',
            text: 'Imported customers are tagged with a green "PM Surya Ghar" badge. You can filter customers by import source (PM Surya Ghar, Manually Added, CRM Import) using the "All Sources" dropdown.',
          },
        ],
      },
      {
        id: 'saved-filters',
        title: 'Saved Filter Preferences',
        icon: 'Filter',
        content: [
          { type: 'paragraph', text: 'Your filter selections on the Customers page are saved automatically and restored every time you log back in. This means you always return to the same filtered view you had when you left.' },
          {
            type: 'list',
            items: [
              'Status filter, agent filter, DISCOM filter, workflow stage filter, import source filter, and lifecycle filter are all saved.',
              'Your preferred view mode (grid or list) is also saved.',
              'Filters auto-save one second after you change them -- a "Filters saved" indicator appears briefly to confirm.',
              'Click the "Reset" button at any time to clear all filters back to their defaults.',
            ],
          },
        ],
      },
      {
        id: 'customer-finance',
        title: 'Customer Finance Page',
        icon: 'DollarSign',
        content: [
          { type: 'paragraph', text: 'Each customer has a dedicated finance page where you can track all project costs, payments, and profit margins.' },
          {
            type: 'list',
            items: [
              'Expense tracking with GST calculation (see below for details)',
              'Loan disbursement tracking with tranche management',
              'Payment tracking for customer payments',
              'Margin tracking showing project profitability',
              'Financial summary with editable agreed cost and additional costs',
            ],
          },
        ],
      },
      {
        id: 'expense-tracking',
        title: 'Expense Tracking with GST',
        icon: 'Receipt',
        content: [
          { type: 'paragraph', text: 'Track all project expenses for each customer with automatic GST calculation. Expense types are now fully manageable from the settings page.' },
          {
            type: 'steps',
            steps: [
              'Open a customer and go to their Finance page.',
              'Scroll to the Expenses section and click "Add Expense".',
              'Select an expense type from the dropdown (these are managed by admin in Settings > Dropdown Values > Expense Types).',
              'Enter the Base Amount and select the GST percentage (0%, 5%, 12%, 18%, or 28%).',
              'The Total Amount and GST Amount will calculate automatically.',
              'Alternatively, you can enter the Total Amount directly and the Base Amount will auto-adjust based on the selected GST rate.',
              'Fill in the expense date, vendor name, payment status, and any remarks.',
              'Click "Save" to record the expense.',
            ],
          },
          {
            type: 'note',
            noteType: 'tip',
            text: 'When you change the Base Amount or GST percentage, the Total updates automatically. When you change the Total Amount directly, the Base Amount recalculates as: Base = Total / (1 + GST%/100). The GST Amount field is always read-only since it is derived from the other two values.',
          },
          {
            type: 'note',
            noteType: 'info',
            text: 'Admin users can add, rename, reorder, and deactivate expense types from Settings > Dropdown Values > Expense Types. Changes take effect immediately across all expense forms.',
          },
        ],
      },
    ],
  },
  {
    id: 'tasks',
    title: 'Tasks and Task Timer',
    icon: 'ListTodo',
    content: [
      { type: 'paragraph', text: 'The Tasks section lets you create, assign, and track tasks related to customers and projects.' },
      {
        type: 'list',
        items: [
          'Create tasks with priority levels and due dates',
          'Assign tasks to specific team members',
          'Start and stop a timer on each task to track time spent',
          'View tasks assigned to you or by user',
          'Mark tasks as complete when finished',
        ],
      },
    ],
  },
  {
    id: 'attendance',
    title: 'Attendance and Leave',
    icon: 'Clock',
    content: [
      { type: 'paragraph', text: 'Track your daily attendance and apply for leave directly from the app.' },
      {
        type: 'list',
        items: [
          'Mark daily check-in and check-out times',
          'View attendance history on the calendar view',
          'Apply for leave with dates and reason',
          'Admins can approve or reject leave applications',
          'View attendance reports with summary statistics',
        ],
      },
    ],
  },
  {
    id: 'documents',
    title: 'Documents',
    icon: 'FileText',
    content: [
      { type: 'paragraph', text: 'Upload, organize, and match documents for each customer project.' },
      {
        type: 'list',
        items: [
          'Solar Document Upload: Quickly upload solar-related documents and auto-match them to customers',
          'Central Upload Center: Upload multiple documents at once',
          'Document Management Dashboard: View all documents, filter by type, and manage matches',
          'Supported formats include PDF, images, and Word documents',
        ],
      },
    ],
  },
  {
    id: 'lead-generators',
    title: 'Lead Generators',
    icon: 'Users',
    content: [
      { type: 'paragraph', text: 'Manage lead generators who refer customers to your business. Track their commissions, locations, and performance.' },
      {
        type: 'note',
        noteType: 'info',
        text: 'The Lead Generators page is only visible to users who have the Admin role or the Lead Generator Access role. The admin assigns this access from the User Management page by checking the "Lead Generator Access" checkbox for any user, regardless of their primary role.',
      },
      {
        type: 'list',
        items: [
          'Add and manage lead generator profiles',
          'Track commission earnings per customer referred',
          'Assign locations to lead generators for territory management',
          'View lead generator performance reports',
        ],
      },
    ],
  },
  {
    id: 'workflow',
    title: 'Workflow Management',
    icon: 'GitBranch',
    content: [
      { type: 'paragraph', text: 'Track each customer through a customizable workflow with multiple stages.' },
      {
        type: 'list',
        items: [
          'View and manage workflow stages from the Workflow page',
          'Track each customer\'s current stage on their profile',
          'Move customers between stages using the Workflow Stage Changer',
          'Filter customers by workflow stage on the Customers page',
          'Admins can create custom workflow stages',
        ],
      },
    ],
  },
  {
    id: 'financial-dashboard',
    title: 'Financial Profit Dashboard',
    icon: 'DollarSign',
    content: [
      { type: 'paragraph', text: 'The Financial Dashboard gives admins and finance users a comprehensive view of project profitability across all customers.' },
      {
        type: 'list',
        items: [
          'View total revenue, expenses, and profit margins',
          'Filter by date range to see performance over specific periods',
          'Breakdown by customer, expense type, or workflow stage',
          'Track GST input credit across all expenses',
          'Monitor loan disbursement progress',
        ],
      },
    ],
  },
  {
    id: 'settings',
    title: 'Settings',
    icon: 'Settings',
    content: [
      { type: 'paragraph', text: 'The Settings menu (gear icon in the top bar) provides access to all configuration options.' },
    ],
    subsections: [
      {
        id: 'company-settings',
        title: 'Company Settings',
        icon: 'Building2',
        content: [
          { type: 'paragraph', text: 'Configure your company name, logo, and header background color. These settings appear on printed documents and quotations.' },
        ],
      },
      {
        id: 'master-data',
        title: 'Master Data (PV Modules and Inverters)',
        icon: 'Package',
        content: [
          { type: 'paragraph', text: 'Manage the list of PV module and inverter manufacturers and their model numbers. These are used when generating quotations.' },
          {
            type: 'steps',
            steps: [
              'Go to Settings > Master Data.',
              'Switch between the PV Module Makes and Inverter Makes tabs.',
              'Click "Add New" to add a manufacturer.',
              'Enter the manufacturer name and model numbers (comma-separated).',
              'Toggle active/inactive status as needed.',
            ],
          },
        ],
      },
      {
        id: 'dropdown-values',
        title: 'Dropdown Values (Lookups)',
        icon: 'List',
        content: [
          { type: 'paragraph', text: 'Manage all dropdown values used throughout the application. This includes expense types, task types, task statuses, priorities, connection types, installation types, payment methods, and document types.' },
          {
            type: 'steps',
            steps: [
              'Go to Settings > Dropdown Values.',
              'Select a category from the dropdown (e.g., Expense Types).',
              'Click "Add New" to create a new value.',
              'Enter the value name and display label.',
              'Toggle active/inactive and set sort order.',
              'Existing values can be edited or deactivated at any time.',
            ],
          },
          {
            type: 'note',
            noteType: 'info',
            text: 'Changes to dropdown values take effect immediately across the entire application. Deactivated values will no longer appear in dropdowns but existing records using them are preserved.',
          },
        ],
      },
      {
        id: 'locations',
        title: 'Location Management',
        icon: 'MapPin',
        content: [
          { type: 'paragraph', text: 'Manage hierarchical location data: states, districts, constituencies, mandals, and villages. These are used for customer address selection and lead generator territory assignment.' },
        ],
      },
      {
        id: 'custom-status',
        title: 'Custom Status Management',
        icon: 'Tag',
        content: [
          { type: 'paragraph', text: 'Create and manage custom statuses for customers beyond the standard workflow stages.' },
        ],
      },
    ],
  },
  {
    id: 'profile',
    title: 'Profile, Themes, and Password',
    icon: 'User',
    content: [
      { type: 'paragraph', text: 'Manage your personal account settings from the Profile page.' },
    ],
    subsections: [
      {
        id: 'profile-info',
        title: 'Profile Information',
        icon: 'User',
        content: [
          { type: 'paragraph', text: 'Update your full name and phone number. Your email address cannot be changed as it is linked to your login.' },
        ],
      },
      {
        id: 'themes',
        title: 'Theme Selection',
        icon: 'Palette',
        content: [
          { type: 'paragraph', text: 'Personalize the look of the entire application by choosing from six professionally designed themes.' },
          {
            type: 'list',
            items: [
              'Teal: Clean teal with light gray backgrounds (default)',
              'Ocean Blue: Deep blue with soft blue-tinted backgrounds',
              'Forest Green: Emerald green with warm cream backgrounds',
              'Sunset Orange: Burnt orange with warm sand backgrounds',
              'Slate Dark: Charcoal dark mode with elevated dark cards',
              'Rose: Rose-pink with blush-tinted backgrounds',
            ],
          },
          {
            type: 'steps',
            steps: [
              'Go to Profile (click your name in the top right, then "My Profile").',
              'Find the Theme section on the right side.',
              'Click any theme swatch to apply it instantly.',
              'The theme is saved to your profile and will load automatically on every future login.',
            ],
          },
          {
            type: 'note',
            noteType: 'info',
            text: 'Each theme changes the entire application: page background, card colors, text colors, buttons, badges, headers, and input fields all adapt to your chosen theme.',
          },
        ],
      },
      {
        id: 'change-password',
        title: 'Change Password',
        icon: 'Lock',
        content: [
          { type: 'paragraph', text: 'Update your account password at any time from the Profile page.' },
          {
            type: 'steps',
            steps: [
              'Go to Profile and find the Change Password section.',
              'Click "Change Password" to expand the form.',
              'Enter your new password (minimum 6 characters).',
              'Confirm the new password.',
              'Click "Update" to save.',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'user-management',
    title: 'User Management (Admin Only)',
    icon: 'Users',
    content: [
      { type: 'paragraph', text: 'Admins can create, edit, and manage all user accounts from the User Management page.' },
      {
        type: 'list',
        items: [
          'Create new user accounts with email and password',
          'Assign one or more roles to each user: Admin, Lead Generator, Lead Generator Access, Employee, Finance',
          'Activate or deactivate user accounts',
          'Filter users by role',
          'Reset user passwords',
        ],
      },
      {
        type: 'note',
        noteType: 'info',
        text: 'The "Lead Generator Access" role is a special permission that allows a user to view and manage the Lead Generators page. Check this box for any user who needs lead generator management capabilities, regardless of their primary role.',
      },
    ],
  },
];

const iconMap: Record<string, any> = {
  Home: Home,
  Users: Users,
  Plus: Plus,
  Upload: Upload,
  Filter: Filter,
  DollarSign: DollarSign,
  Receipt: Receipt,
  ListTodo: ListTodo,
  Clock: Clock,
  FileText: FileText,
  GitBranch: GitBranch,
  Settings: SettingsIcon,
  Building2: Building2,
  Package: Package,
  List: List,
  MapPin: MapPin,
  Tag: Tag,
  User: UserIcon,
  Palette: Palette,
  Lock: Lock,
};

import { Home, Users, Plus, Upload, Filter, DollarSign, Receipt, ListTodo, Clock, GitBranch, Settings as SettingsIcon, Building2, Package, List, MapPin, Tag, User as UserIcon, Palette, Lock } from 'lucide-react';

function ContentBlock({ block }: { block: DocContentBlock }) {
  if (block.type === 'paragraph') {
    return <p className="text-sm leading-relaxed theme-text-secondary mb-3 print-avoid-break">{block.text}</p>;
  }

  if (block.type === 'list') {
    return (
      <ul className="list-disc list-inside space-y-1.5 mb-3 print-avoid-break">
        {block.items?.map((item, i) => (
          <li key={i} className="text-sm theme-text-secondary">{item}</li>
        ))}
      </ul>
    );
  }

  if (block.type === 'steps') {
    return (
      <ol className="space-y-2 mb-3 print-avoid-break">
        {block.steps?.map((step, i) => (
          <li key={i} className="flex gap-3 text-sm theme-text-secondary">
            <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: 'var(--color-primary)' }}>
              {i + 1}
            </span>
            <span className="pt-0.5">{step}</span>
          </li>
        ))}
      </ol>
    );
  }

  if (block.type === 'note') {
    const colors = {
      info: 'bg-blue-50 border-blue-200 text-blue-800',
      warning: 'bg-amber-50 border-amber-200 text-amber-800',
      tip: 'bg-green-50 border-green-200 text-green-800',
    };
    const colorClass = colors[block.noteType || 'info'];
    return (
      <div className={`p-3 rounded-lg border text-sm mb-3 print-avoid-break ${colorClass}`}>
        {block.text}
      </div>
    );
  }

  if (block.type === 'table' && block.headers && block.rows) {
    return (
      <div className="overflow-x-auto mb-3 print-avoid-break">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-gray-300">
              {block.headers.map((h, i) => (
                <th key={i} className="text-left py-2 px-3 font-semibold theme-text-primary">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, i) => (
              <tr key={i} className="border-b border-gray-200">
                {row.map((cell, j) => (
                  <td key={j} className="py-2 px-3 theme-text-secondary">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return null;
}

function SectionView({ section, depth = 0 }: { section: DocSection; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 1);
  const Icon = iconMap[section.icon] || FileText;

  return (
    <div className={depth > 0 ? 'ml-4' : ''}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 text-left py-2 print-avoid-break"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 theme-text-muted no-print" />
        ) : (
          <ChevronRight className="w-4 h-4 theme-text-muted no-print" />
        )}
        <Icon className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--color-primary)' }} />
        <h3
          className={`font-semibold theme-text-primary ${depth === 0 ? 'text-lg' : 'text-base'}`}
        >
          {section.title}
        </h3>
      </button>

      {expanded && (
        <div className={`${depth > 0 ? 'ml-9' : 'ml-9'} mb-4`}>
          {section.content.map((block, i) => (
            <ContentBlock key={i} block={block} />
          ))}
          {section.subsections?.map((sub) => (
            <SectionView key={sub.id} section={sub} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DocumentationPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSections = searchQuery
    ? DOCUMENTATION_DATA.map((section) => {
        const matchesSection =
          section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          section.content.some(
            (b) =>
              (b.text && b.text.toLowerCase().includes(searchQuery.toLowerCase())) ||
              (b.items && b.items.some((i) => i.toLowerCase().includes(searchQuery.toLowerCase()))) ||
              (b.steps && b.steps.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase())))
          );
        const matchingSubsections = section.subsections?.filter(
          (sub) =>
            sub.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            sub.content.some(
              (b) =>
                (b.text && b.text.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (b.items && b.items.some((i) => i.toLowerCase().includes(searchQuery.toLowerCase()))) ||
                (b.steps && b.steps.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase())))
            )
        );
        if (matchesSection || (matchingSubsections && matchingSubsections.length > 0)) {
          return {
            ...section,
            subsections: matchingSubsections || section.subsections,
          };
        }
        return null;
      }).filter(Boolean) as DocSection[]
    : DOCUMENTATION_DATA;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 no-print">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold theme-text-primary">User Guide</h1>
            <p className="theme-text-secondary mt-1">
              Complete documentation for the Solar Customer Management System
            </p>
          </div>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 btn-primary rounded-lg transition-colors"
          >
            <Download className="w-5 h-5" />
            Download PDF
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 theme-text-muted" />
          <input
            type="text"
            placeholder="Search the guide..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 border theme-input-border rounded-lg focus-ring-primary theme-input-bg theme-text-primary"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Print-only header */}
      <div className="print-only mb-6">
        <h1 className="text-2xl font-bold">Solar Customer Management System - User Guide</h1>
        <p className="text-sm text-gray-600">Generated on {new Date().toLocaleDateString()}</p>
        <hr className="my-4" />
      </div>

      <div className="theme-card rounded-xl border theme-card-border p-6 print:border-0 print:p-0">
        {filteredSections.length === 0 ? (
          <p className="text-center py-8 theme-text-muted">
            No sections found matching "{searchQuery}"
          </p>
        ) : (
          filteredSections.map((section) => (
            <SectionView key={section.id} section={section} />
          ))
        )}
      </div>

      <div className="mt-6 text-center text-xs theme-text-muted no-print">
        <p>This guide is always kept up to date with the latest features.</p>
        <p className="mt-1">Click "Download PDF" to save or print this guide.</p>
      </div>
    </div>
  );
}
