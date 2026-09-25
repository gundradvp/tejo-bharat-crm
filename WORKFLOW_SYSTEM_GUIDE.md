# Workflow Management System Guide

## Overview

The Workflow Management System provides comprehensive tracking and management of solar installation projects from initial site assessment to final completion. The system automatically tracks stage transitions, provides visual progress indicators, and maintains a complete audit trail.

## Features

### 1. Workflow Stage Management (`/workflow`)

Accessible from the Admin Dashboard, this interface allows administrators to:

- **View All Workflow Stages**: See the complete list of workflow stages organized in sequential order
- **Edit Stages**: Modify stage names, descriptions, categories, and order
- **Add Custom Stages**: Create additional stages to match your business process
- **Deactivate Stages**: Temporarily disable stages without deleting them
- **View Stage Statistics**: See how many customers are currently in each stage

**Workflow Categories:**
- Assessment: Initial site surveys and feasibility studies
- Documentation: Document collection and verification
- Commercial: Quotations and pricing
- Financing: Loan applications and approvals
- Installation: Material procurement and installation work
- Regulatory: DISCOM submissions and inspections
- Subsidy: Government subsidy applications
- Closure: Final documentation and warranty registration

### 2. Customer Workflow Tracking

Each customer record includes comprehensive workflow tracking:

#### **Workflow Stage Changer**
- Quick dropdown selector to move customers between stages
- Optional notes field for documenting the reason for stage changes
- Automatic timestamp tracking
- Audit trail of all transitions

#### **Workflow Progress View**
- Visual timeline showing all stages
- Clear indicators for completed, current, and pending stages
- Stage-specific information including dates and responsible users
- Complete transition history with notes

#### **Workflow Transition History**
- Complete log of all stage changes
- User attribution for each transition
- Date and time stamps
- Optional notes for each transition

### 3. Pre-configured Workflow Stages

The system comes with 26 pre-configured stages covering the complete solar installation lifecycle:

1. **Site Assessment** - First visit to assess site feasibility
2. **Document Collection** - Collecting customer documents
3. **Quotation Preparation** - Preparing quotation
4. **Quotation Approved** - Customer approved quotation
5. **Financing Arrangement** - Preparing loan application
6. **Loan Applied** - Loan submitted to bank
7. **Bank Documents Submitted** - Documents to bank
8. **Loan Sanctioned** - Bank approved loan
9. **Awaiting Disbursement** - Waiting for disbursement
10. **Material Procurement** - Ordering materials
11. **Material in Transit** - Materials shipping
12. **Material Delivered** - Materials received
13. **Installation In Progress** - Installation begun
14. **Installation Completed** - Installation finished
15. **DISCOM Documentation** - Preparing DISCOM docs
16. **DISCOM Submitted** - Submitted to DISCOM
17. **Inspection Scheduled** - DISCOM inspection scheduled
18. **Inspection Passed** - Inspection successful
19. **Net Meter Installed** - Meter installed
20. **Subsidy Preparation** - Preparing subsidy application
21. **Subsidy Submitted** - Subsidy claim submitted
22. **Subsidy Approved** - Subsidy approved
23. **Bank Completion Docs** - Final docs to bank
24. **Final Disbursement** - Requested remaining loan
25. **Warranty Registration** - Registering warranties
26. **Project Completed** - All completed

## How to Use

### For Administrators

1. **Configure Workflow Stages**
   - Navigate to Admin Dashboard
   - Click "Workflow Management"
   - Review and customize stages as needed
   - Add company-specific stages if required

2. **Monitor Workflow Progress**
   - View dashboard statistics to see customer distribution across stages
   - Identify bottlenecks where customers are stuck
   - Track team performance by stage completion times

### For Employees

1. **Update Customer Workflow Stage**
   - Open customer details page
   - Locate the "Workflow Stage Changer" section
   - Select the new stage from the dropdown
   - Add notes explaining the transition (optional)
   - Click "Update Stage"

2. **View Customer Progress**
   - Scroll to "Workflow Progress" section
   - Review the visual timeline
   - Check transition history for context
   - Identify next steps based on current stage

## Database Tables

The workflow system uses the following tables:

- **workflow_stages**: Master list of all workflow stages
- **customer_workflow_transitions**: History of all stage changes
- **customers.current_workflow_stage**: Current stage for each customer
- **customers.workflow_stage_updated_at**: Timestamp of last stage change

## Automatic Features

1. **Transition Tracking**: Every stage change is automatically logged
2. **User Attribution**: System records who made each change
3. **Timestamp Recording**: Precise date/time for all transitions
4. **Tenant Isolation**: All workflow data respects tenant boundaries

## Best Practices

1. **Regular Updates**: Keep customer stages current for accurate reporting
2. **Add Notes**: Document important details when changing stages
3. **Review Progress**: Regularly check workflow progress views
4. **Customize Stages**: Adapt the workflow to your specific processes
5. **Monitor Statistics**: Use workflow stats to identify process improvements

## Integration with Other Systems

The workflow system integrates with:

- **Customer Management**: Direct integration in customer details
- **Activity Logs**: All transitions logged in activity timeline
- **Reporting**: Stage data available for custom reports
- **Financial Tracking**: Links to payment and disbursement stages

## Technical Notes

- Workflow transitions are tracked via database trigger
- Stage changes automatically update customer records
- All operations respect Row Level Security (RLS)
- Tenant isolation ensures data privacy
- Changes are audited in the activity log

## Support

For questions or issues with the workflow system:
1. Check that workflow stages are properly configured
2. Verify user has appropriate permissions
3. Review activity logs for detailed transition history
4. Contact system administrator for advanced configuration
