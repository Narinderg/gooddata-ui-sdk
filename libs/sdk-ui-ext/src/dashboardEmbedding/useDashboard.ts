// (C) 2020 GoodData Corporation
import { IAnalyticalBackend, IDashboard } from "@gooddata/sdk-backend-spi";
import {
    GoodDataSdkError,
    useBackend,
    useCancelablePromise,
    UseCancelablePromiseCallbacks,
    UseCancelablePromiseState,
    useWorkspace,
} from "@gooddata/sdk-ui";
import { ObjRef, objRefToString } from "@gooddata/sdk-model";
import invariant from "ts-invariant";

/**
 * @beta
 */
export interface IUseDashboardConfig extends UseCancelablePromiseCallbacks<IDashboard, GoodDataSdkError> {
    /**
     * Reference to the dashboard to get.
     */
    ref: ObjRef;

    /**
     * Backend to work with.
     *
     * Note: the backend must come either from this property or from BackendContext. If you do not specify
     * backend here, then the executor MUST be rendered within an existing BackendContext.
     */
    backend?: IAnalyticalBackend;

    /**
     * Workspace where the insight exists.
     *
     * Note: the workspace must come either from this property or from WorkspaceContext. If you do not specify
     * workspace here, then the executor MUST be rendered within an existing WorkspaceContext.
     */
    workspace?: string;
}

/**
 * Hook allowing to download dashboard data
 * @param config - configuration of the hook
 * @beta
 */
export function useDashboard({
    ref,
    backend,
    onCancel,
    onError,
    onLoading,
    onPending,
    onSuccess,
    workspace,
}: IUseDashboardConfig): UseCancelablePromiseState<IDashboard, any> {
    const backendFromContext = useBackend();
    const workspaceFromContext = useWorkspace();

    const effectiveBackend = backend ?? backendFromContext;
    const effectiveWorkspace = workspace ?? workspaceFromContext;

    invariant(
        effectiveBackend,
        "The backend in useLoadDashboard must be defined. Either pass it as a config prop or make sure there is a BackendProvider up the component tree.",
    );

    invariant(
        effectiveWorkspace,
        "The workspace in useLoadDashboard must be defined. Either pass it as a config prop or make sure there is a WorkspaceProvider up the component tree.",
    );

    const promise = () => effectiveBackend.workspace(effectiveWorkspace).dashboards().getDashboard(ref);

    return useCancelablePromise({ promise, onCancel, onError, onLoading, onPending, onSuccess }, [
        effectiveWorkspace,
        objRefToString(ref),
    ]);
}
