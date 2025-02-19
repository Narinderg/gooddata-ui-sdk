// (C) 2021 GoodData Corporation

/**
 * @alpha
 */
export type DashboardQueryType =
    | "GDC.DASH/QUERY.INSIGHT.DATE.DATASETS"
    | "GDC.DASH/QUERY.INSIGHT.ATTRIBUTE.META"
    | "GDC.DASH/QUERY.MEASURE.DATE.DATASETS"
    | "GDC.DASH/QUERY.WIDGET.FILTERS"
    | "GDC.DASH/QUERY.WIDGET.BROKEN_ALERTS";

/**
 * Base type for all dashboard queries. A dashboard query encapsulates how complex, read-only dashboard-specific logic
 * can be can be executed.
 *
 * @alpha
 */
export interface IDashboardQuery<_TResult = any> {
    /**
     * Query type. Always starts with "GDC.DASH/QUERY".
     */
    readonly type: DashboardQueryType;

    /**
     * Correlation ID can be provided when creating a query. Events emitted during the query processing
     * will contain the same correlation ID.
     */
    readonly correlationId?: string;
}

/**
 * Utility type to extract the type of the {@link IDashboardQuery} result.
 *
 * @alpha
 */
export type IDashboardQueryResult<T> = T extends IDashboardQuery<infer TResult> ? TResult : never;
