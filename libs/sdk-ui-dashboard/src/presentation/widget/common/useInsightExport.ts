// (C) 2021 GoodData Corporation
import { useCallback, useState } from "react";
import invariant from "ts-invariant";
import { IExportFunction, IExtendedExportConfig } from "@gooddata/sdk-ui";
import {
    selectSettings,
    useDashboardSelector,
    selectIsExecutionResultExportableToCsvByRef,
    selectIsExecutionResultExportableToXlsxByRef,
    useDashboardDispatch,
    dispatchAndWaitFor,
    exportInsightWidget,
} from "../../../model";
import { useExportHandler } from "./useExportHandler";
import { useExportDialogContext } from "../../dashboardContexts";
import { ObjRef } from "@gooddata/sdk-model";

export const useInsightExport = (config: { title: string; widgetRef: ObjRef }) => {
    const { title, widgetRef } = config;
    const [isExporting, setIsExporting] = useState(false);

    const dispatch = useDashboardDispatch();
    const exportFunction = useCallback<IExportFunction>(
        (configToUse) => dispatchAndWaitFor(dispatch, exportInsightWidget(widgetRef, configToUse)),
        [widgetRef],
    );

    const isExportableToCsv = useDashboardSelector(selectIsExecutionResultExportableToCsvByRef(widgetRef));
    const isExportableToXlsx = useDashboardSelector(selectIsExecutionResultExportableToXlsxByRef(widgetRef));

    const settings = useDashboardSelector(selectSettings);

    const exportHandler = useExportHandler();
    const { openDialog, closeDialog } = useExportDialogContext();

    const onExportCSV = useCallback(() => {
        setIsExporting(true);
        const exportConfig: IExtendedExportConfig = {
            format: "csv",
            title,
        };
        // if this bombs there is an issue with the logic enabling the buttons
        invariant(exportFunction);
        exportHandler(exportFunction, exportConfig).then(() => setIsExporting(false));
    }, [exportFunction, title]);

    const onExportXLSX = useCallback(() => {
        openDialog({
            onSubmit: ({ includeFilterContext, mergeHeaders }) => {
                setIsExporting(true);
                // if this bombs there is an issue with the logic enabling the buttons
                invariant(exportFunction);
                closeDialog();
                exportHandler(exportFunction, {
                    format: "xlsx",
                    mergeHeaders,
                    includeFilterContext,
                    title,
                }).then(() => setIsExporting(false));
            },
            includeFilterContext: Boolean(settings?.activeFiltersByDefault ?? true),
            mergeHeaders: Boolean(settings?.cellMergedByDefault ?? true),
            filterContextVisible: Boolean(settings?.enableActiveFilterContext ?? true),
        });
    }, [settings, title, exportFunction, closeDialog]);

    const exportCSVEnabled = !isExporting && isExportableToCsv;
    const exportXLSXEnabled = !isExporting && isExportableToXlsx;

    return {
        exportCSVEnabled,
        exportXLSXEnabled,
        onExportCSV,
        onExportXLSX,
    };
};
