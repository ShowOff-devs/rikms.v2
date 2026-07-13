export type ProjectReportType = 'terminal-report' | 'project-accomplishment';

export type ReportingPeriod = 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'Annual' | 'Final';

export type ReportCompletenessClassification =
    | 'not_started'
    | 'incomplete'
    | 'complete';

export type BudgetClassification =
    | 'not_reported'
    | 'not_utilized'
    | 'low'
    | 'moderate'
    | 'high'
    | 'fully_utilized'
    | 'overutilized';

export type AccomplishmentClassification =
    | 'not_reported'
    | 'not_started'
    | 'in_progress'
    | 'substantially_complete'
    | 'complete';

export type ProjectReportWorkflowStatus =
    | 'draft'
    | 'submitted'
    | 'under_review'
    | 'approved'
    | 'rejected'
    | 'published'
    | 'archived'
    | 'superseded';

export type ProjectReportAnalyticsFilters = {
    agency_id?: string;
    report_type?: ProjectReportType | 'all';
    publication_year?: string;
    reporting_period?: ReportingPeriod | 'all';
    workflow_status?: ProjectReportWorkflowStatus | 'all';
    completeness?: ReportCompletenessClassification | 'all';
    budget_classification?: BudgetClassification | 'all';
    accomplishment_classification?: AccomplishmentClassification | 'all';
    funding_source?: string;
    date_from?: string;
    date_to?: string;
};

export type ProjectReportSummary = {
    total_reports: number;
    terminal_reports: number;
    project_accomplishment_reports: number;
    complete_reports: number;
    incomplete_reports: number;
    not_started_reports: number;
    submitted_reports: number;
    approved_reports: number;
    published_reports: number;
    reports_with_financial_data: number;
    reports_without_financial_data: number;
    total_allotted_budget: string;
    total_released_amount: string;
    total_obligated_amount: string;
    total_utilized_amount: string;
    total_remaining_balance: string;
    overall_utilization_percentage: number | null;
};

export type ProjectReportDistributionItem = {
    key: string;
    count: number;
    percentage: number | null;
};

export type ProjectReportStatusAnalytics = {
    report_type: ProjectReportDistributionItem[];
    workflow_status: ProjectReportDistributionItem[];
    completeness: ProjectReportDistributionItem[];
    accomplishment: ProjectReportDistributionItem[];
};

export type ProjectReportBudgetTotals = {
    key?: string;
    report_count: number;
    reports_with_financial_data: number;
    reports_without_financial_data: number;
    allotted_budget: string;
    released_amount: string;
    obligated_amount: string;
    utilized_amount: string;
    remaining_balance: string;
    utilization_percentage: number | null;
};

export type ProjectReportBudgetAnalytics = {
    totals: ProjectReportBudgetTotals;
    classification_distribution: ProjectReportDistributionItem[];
    by_report_type: ProjectReportBudgetTotals[];
    by_reporting_period: ProjectReportBudgetTotals[];
    by_agency?: ProjectReportAgencyComparison[];
};

export type ProjectReportAgencyComparison = {
    agency_id: number | null;
    agency_name: string | null;
    agency_short_name: string | null;
    report_count: number;
    complete_count: number;
    incomplete_count: number;
    allotted_budget: string;
    utilized_amount: string;
    remaining_balance: string;
    utilization_percentage: number | null;
    reports_without_financial_data: number;
};

export type ReportCompletenessResult = {
    data_status: 'reported' | 'not_applicable';
    percentage: number | null;
    completed_sections: number;
    total_sections: number;
    is_complete: boolean;
    classification: ReportCompletenessClassification | 'not_applicable';
    sections: Record<
        string,
        {
            complete: boolean;
            missing_fields: string[];
        }
    >;
};

export type ReportBudgetResult = {
    data_status: 'reported' | 'not_reported' | 'not_applicable';
    allotted_budget?: string | null;
    released_amount?: string | null;
    obligated_amount?: string | null;
    utilized_amount?: string | null;
    remaining_balance?: string | null;
    utilization_percentage?: number | null;
    classification?: BudgetClassification;
    warnings?: string[];
};

export type ReportAccomplishmentResult = {
    data_status: 'reported' | 'not_reported' | 'not_applicable';
    physical_accomplishment_percentage?: number | null;
    classification?: AccomplishmentClassification;
    performance_items_total?: number;
    performance_items_with_percentage?: number;
    calculated_item_average?: number | null;
    official_value_source?: string | null;
};

export type ProjectReportAnalyticsRecord = {
    research_id: number;
    title: string;
    agency?: {
        id: number | null;
        name: string | null;
        short_name: string | null;
    };
    report_type: ProjectReportType;
    reporting_period: string | null;
    publication_year: number | null;
    workflow_status: string;
    submitted_at: string | null;
    approved_at: string | null;
    completeness: ReportCompletenessResult;
    budget: ReportBudgetResult;
    accomplishment: ReportAccomplishmentResult;
};

export type ProjectReportPerformanceItem = {
    id: number;
    project_name: string | null;
    target_value: string | null;
    actual_value: string | null;
    accomplishment_percentage: string | number | null;
    project_status: string | null;
    remarks: string | null;
    sort_order: number;
};

export type ProjectReportAnalyticsDetail = ProjectReportAnalyticsRecord & {
    project_start_date: string | null;
    project_end_date: string | null;
    financial_as_of_date: string | null;
    performance_items: ProjectReportPerformanceItem[];
    can_edit: boolean;
};

export type ApiPagination = {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from: number | null;
    to: number | null;
};

export type ProjectReportRecordsResponse = {
    data: ProjectReportAnalyticsRecord[];
    pagination: ApiPagination;
};
