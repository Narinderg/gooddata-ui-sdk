// (C) 2019-2021 GoodData Corporation
import flatten from "lodash/flatten";
import round from "lodash/round";
import isNil from "lodash/isNil";
import isEqual from "lodash/isEqual";
import {
    IDashboardLayoutSizeByScreenSize,
    isDashboardLayout,
    IDashboardLayoutSize,
    ScreenSize,
    isWidget,
    isWidgetDefinition,
    IDashboardLayoutItem,
    IDashboardLayout,
    IDashboardLayoutSection,
    WidgetType,
} from "@gooddata/sdk-backend-spi";
import {
    ALL_SCREENS,
    DASHBOARD_LAYOUT_CONTAINER_WIDTHS,
    DASHBOARD_LAYOUT_GRID_COLUMNS_COUNT,
    DASHBOARD_LAYOUT_MAX_HEIGHT_AS_RATIO_XS,
    INSIGHT_WIDGET_DIMENSIONS_DEFAULT,
    KPI_WIDGET_DIMENSIONS_DEFAULT,
    INSIGHT_WIDGET_DIMENSIONS_TABLE,
    GRID_ROW_HEIGHT_IN_PX,
} from "../constants";
import { DashboardLayoutFacade } from "../facade/layout";
import { VisType } from "@gooddata/sdk-ui";
import { IDashboardLayoutItemFacade } from "../facade/interfaces";

/**
 * Unify dashboard layout items height for all screens.
 *
 * @param items - dashboard layout items
 */
export function unifyDashboardLayoutItemHeights<TWidget>(
    layout: IDashboardLayout<TWidget>,
    enableCustomHeight: boolean,
): IDashboardLayout<TWidget>;
export function unifyDashboardLayoutItemHeights<TWidget>(
    items: IDashboardLayoutItem<TWidget>[],
    enableCustomHeight: boolean,
): IDashboardLayoutItem<TWidget>[];
export function unifyDashboardLayoutItemHeights<TWidget>(
    itemsOrLayout: IDashboardLayout<TWidget> | IDashboardLayoutItem<TWidget>[],
    enableCustomHeight: boolean,
): IDashboardLayout<TWidget> | IDashboardLayoutItem<TWidget>[] {
    console.log("tete", enableCustomHeight);
    if (isDashboardLayout<TWidget>(itemsOrLayout)) {
        const updatedLayout: IDashboardLayout<TWidget> = {
            ...itemsOrLayout,
            sections: DashboardLayoutFacade.for(itemsOrLayout)
                .sections()
                .reduce((acc: IDashboardLayoutSection<TWidget>[], section) => {
                    return [
                        ...acc,
                        {
                            ...section.raw(),
                            items: unifyDashboardLayoutItemHeights(section.items().raw(), enableCustomHeight),
                        },
                    ];
                }, []),
        };

        return updatedLayout;
    }

    const itemsWithSizeForAllScreens = itemsOrLayout.map((item) => ({
        ...item,
        size: implicitLayoutItemSizeFromXlSize(item.size.xl, enableCustomHeight),
    }));

    const itemsWithUnifiedHeightForAllScreens: IDashboardLayoutItem<TWidget>[] = ALL_SCREENS.reduce(
        (acc, screen) => {
            const itemsAsFutureGridRows = splitDashboardLayoutItemsAsRenderedGridRows(acc, screen);

            const itemsWithUnifiedHeight = flatten(
                itemsAsFutureGridRows.map((futureGridRow) =>
                    unifyDashboardLayoutItemHeightsForScreen(futureGridRow, screen),
                ),
            );

            return itemsWithUnifiedHeight;
        },
        itemsWithSizeForAllScreens,
    );

    return itemsWithUnifiedHeightForAllScreens;
}

/**
 * Derive dashboard layout size for all screens from dashboard layout size defined for xl screen.
 *
 * @param xlSize - dashboard layout size for xl screen
 */
function implicitLayoutItemSizeFromXlSize(
    xlSize: IDashboardLayoutSize,
    enableCustomHeight?: boolean,
): IDashboardLayoutSizeByScreenSize {
    const xlWidth: number = xlSize.gridWidth;
    const xlHeight: number = xlSize.gridHeight;
    const ratio: number = xlSize.heightAsRatio;

    switch (xlWidth) {
        case 0:
            return dashboardLayoutItemSizeForAllScreens(0, 0, 0, 0, 0, 0, 0, enableCustomHeight);
        case 1:
            return dashboardLayoutItemSizeForAllScreens(
                ratio,
                xlHeight,
                xlWidth,
                xlWidth,
                2,
                6,
                12,
                enableCustomHeight,
            );
        case 2:
            return dashboardLayoutItemSizeForAllScreens(
                ratio,
                xlHeight,
                xlWidth,
                xlWidth,
                4,
                6,
                12,
                enableCustomHeight,
            );
        case 3:
        case 4:
        case 5:
        case 6:
        case 7:
        case 8:
        case 9:
            return dashboardLayoutItemSizeForAllScreens(
                ratio,
                xlHeight,
                xlWidth,
                xlWidth,
                6,
                12,
                12,
                enableCustomHeight,
            );
        case 10:
            return dashboardLayoutItemSizeForAllScreens(
                ratio,
                xlHeight,
                xlWidth,
                xlWidth,
                12,
                12,
                12,
                enableCustomHeight,
            );
        case 11:
            return dashboardLayoutItemSizeForAllScreens(
                ratio,
                xlHeight,
                xlWidth,
                xlWidth,
                12,
                12,
                12,
                enableCustomHeight,
            );
        case 12:
            return dashboardLayoutItemSizeForAllScreens(
                ratio,
                xlHeight,
                xlWidth,
                xlWidth,
                12,
                12,
                12,
                enableCustomHeight,
            );
    }
}

/**
 * Create dashboard layout item size for all screens,
 * with identical height, defined as ratio,
 * but different width, defined as grid items count.
 *
 * @param heightAsRatio - height as ratio to the width, defined in percents
 * @param gridHeight - height as number of grid rows
 * @param xl - width as grid items count for xl screen
 * @param lg - width as grid items count for lg screen
 * @param md - width as grid items count for md screen
 * @param sm - width as grid items count for sm screen
 * @param xs - width as grid items count for xs screen
 * @param enableCustomHeight - feature flag value for widget height customization
 */
function dashboardLayoutItemSizeForAllScreens(
    heightAsRatio: number,
    gridHeight: number,
    xl: number,
    lg: number,
    md: number,
    sm: number,
    xs: number,
    enableCustomHeight: boolean,
): IDashboardLayoutSizeByScreenSize {
    if (enableCustomHeight) {
        return {
            xl: {
                gridWidth: xl,
                gridHeight,
            },
            lg: {
                gridWidth: lg,
                gridHeight,
            },
            md: {
                gridWidth: md,
                gridHeight,
            },
            sm: {
                gridWidth: sm,
                gridHeight,
            },
            xs: {
                gridWidth: xs,
                gridHeight,
            },
        };
    }
    return {
        xl: {
            gridWidth: xl,
            heightAsRatio,
        },
        lg: {
            gridWidth: lg,
            heightAsRatio,
        },
        md: {
            gridWidth: md,
            heightAsRatio,
        },
        sm: {
            gridWidth: sm,
            heightAsRatio,
        },
        xs: {
            gridWidth: xs,
            heightAsRatio,
        },
    };
}

/**
 * Divide the items into a list representing the future rows of the grid.
 * This is useful for performing item transformations, depending on how they really appear in the grid.
 *
 * @param items - dashboard layout items
 * @param screen - responsive screen class
 */
export function splitDashboardLayoutItemsAsRenderedGridRows<TWidget>(
    items: IDashboardLayoutItem<TWidget>[],
    screen: ScreenSize,
): IDashboardLayoutItem<TWidget>[][] {
    const renderedRows: IDashboardLayoutItem<TWidget>[][] = [];

    let currentRowWidth = 0;
    let currentRow: IDashboardLayoutItem<TWidget>[] = [];

    items.forEach((item) => {
        const itemSize: IDashboardLayoutSize = item.size[screen];

        if (isNil(itemSize)) {
            throw Error("Item size for current screen is undefined");
        }

        if (currentRowWidth + itemSize.gridWidth > DASHBOARD_LAYOUT_GRID_COLUMNS_COUNT) {
            renderedRows.push(currentRow);
            currentRow = [];
            currentRowWidth = 0;
        }

        currentRow.push(item);
        currentRowWidth = currentRowWidth + itemSize.gridWidth;
    });

    if (currentRow.length > 0) {
        renderedRows.push(currentRow);
    }

    return renderedRows;
}

/**
 * Calculate dashboard layout item height for the provided screen.
 * Result, if custom height is defined, is height of the item, defined
 * as grid items count, multiplied by {@link GRID_ROW_HEIGHT_IN_PX} or width of the item,
 * defined as grid items count, multiplied by height, defined as a ratio.
 *
 * @param item - dashboard layout item
 * @param screen - responsive screen class
 */
function dashboardLayoutItemHeightForScreen<TWidget>(
    item: IDashboardLayoutItem<TWidget>,
    screen: ScreenSize,
) {
    const { gridWidth, gridHeight, heightAsRatio = 0 } = item.size?.[screen] ?? {};
    if (!gridWidth) {
        return 0;
    }

    if (gridHeight) {
        return getDashboardLayoutItemHeightForGrid(gridHeight);
    }

    return gridWidth * heightAsRatio;
}

/**
 * Unify dashboard layout items height, defined as ratio, for the provided screen.
 * It overrides height of all items to the highest item height found for the provided screen.
 *
 * @param items - dashboard layout items
 * @param screen -  responsive screen class
 */
function unifyDashboardLayoutItemHeightsForScreen<TWidget>(
    items: IDashboardLayoutItem<TWidget>[],
    screen: ScreenSize,
): IDashboardLayoutItem<TWidget>[] {
    const heights = items.map((item) => dashboardLayoutItemHeightForScreen(item, screen));
    const maxHeight = Math.max(0, ...heights);

    if (maxHeight === 0) {
        return items;
    }

    return items.map((item) => updateDashboardLayoutItemHeight(item, screen, maxHeight));
}

const updateDashboardLayoutItemHeight = <TWidget>(
    item: IDashboardLayoutItem<TWidget>,
    screen: ScreenSize,
    maxHeight: number,
): IDashboardLayoutItem<TWidget> => {
    const itemSizeForCurrentScreen = item.size[screen];
    const heightAsRatio = itemSizeForCurrentScreen?.gridWidth
        ? round(maxHeight / itemSizeForCurrentScreen.gridWidth, 2)
        : 0;

    let updatedColumn = item;

    if (
        !itemSizeForCurrentScreen?.gridHeight &&
        !isNil(itemSizeForCurrentScreen?.heightAsRatio) &&
        itemSizeForCurrentScreen?.heightAsRatio !== heightAsRatio
    ) {
        if (isWidget(updatedColumn.widget) || isWidgetDefinition(updatedColumn.widget)) {
            updatedColumn = {
                ...updatedColumn,
                widget: {
                    ...updatedColumn.widget,
                },
            };
        }

        updatedColumn = {
            ...updatedColumn,
            size: {
                ...updatedColumn.size,
                [screen]: {
                    ...updatedColumn.size[screen],
                    heightAsRatio,
                },
            },
        };
    }

    if (screen === "xs" && heightAsRatio > DASHBOARD_LAYOUT_MAX_HEIGHT_AS_RATIO_XS) {
        updatedColumn = {
            ...updatedColumn,
            size: {
                ...updatedColumn.size,
                [screen]: {
                    ...updatedColumn.size[screen],
                    heightAsRatio: DASHBOARD_LAYOUT_MAX_HEIGHT_AS_RATIO_XS,
                },
            },
        };
    }

    return updatedColumn;
};

/**
 * Tuple that represents a item position in the layout
 * [sectionIndex, itemIndex]
 *
 * @internal
 */
type ItemPosition = [number, number];

/**
 *
 * @internal
 */
export const getResizedItemPositions = <TWidget>(
    originalLayout: IDashboardLayout<TWidget>,
    resizedLayout: IDashboardLayout<TWidget>,
    positions: ItemPosition[] = [],
): ItemPosition[] => {
    const originalLayoutFacade = DashboardLayoutFacade.for(originalLayout);
    return DashboardLayoutFacade.for(resizedLayout)
        .sections()
        .reduce((acc: ItemPosition[], section) => {
            return section.items().reduce((acc, item) => {
                const originalColumn = originalLayoutFacade
                    .sections()
                    .section(section.index())
                    .items()
                    .item(item.index());
                const originalContent = originalColumn.widget();
                const updatedContent = item.widget();

                // Is nested layout?
                if (isDashboardLayout(originalContent) && isDashboardLayout(updatedContent)) {
                    return getResizedItemPositions(originalContent, updatedContent, positions);
                }

                if (
                    !isEqual(originalColumn.size(), item.size()) &&
                    (isWidget(updatedContent) || isWidgetDefinition(updatedContent))
                ) {
                    acc.push([item.section().index(), item.index()]);
                }

                return acc;
            }, acc);
        }, positions);
};

export const getDashboardLayoutHeight = (
    size: IDashboardLayoutSize,
    enableCustomHeight: boolean,
): number | undefined => {
    const { gridHeight } = size;
    if (gridHeight && enableCustomHeight) {
        return getDashboardLayoutItemHeightForGrid(gridHeight);
    }

    return undefined;
};

export const getDashboardLayoutItemHeightForRatioAndScreen = (
    size: IDashboardLayoutSize,
    screen: ScreenSize,
): number => {
    const { gridWidth, heightAsRatio } = size;
    const actualWidth = DASHBOARD_LAYOUT_CONTAINER_WIDTHS[screen];

    const actualColumnUnitWidth = actualWidth / DASHBOARD_LAYOUT_GRID_COLUMNS_COUNT;
    return actualColumnUnitWidth * gridWidth * (heightAsRatio / 100);
};

export const getDashboardLayoutItemHeightForGrid = (gridHeight: number): number =>
    gridHeight * GRID_ROW_HEIGHT_IN_PX;

export function getDashboardLayoutItemMaxGridWidth(
    item: IDashboardLayoutItemFacade<any>,
    screen: ScreenSize,
): number {
    let gridRowWidth = 0;
    const sectionItems = item.section().items().all();

    for (const sectionItem of sectionItems) {
        const newWidth = sectionItem.sizeForScreen(screen).gridWidth + gridRowWidth;

        if (newWidth <= DASHBOARD_LAYOUT_GRID_COLUMNS_COUNT) {
            if (sectionItem.index() === item.index()) {
                break;
            }
            gridRowWidth = newWidth;
        } else {
            if (sectionItem.index() === item.index()) {
                return DASHBOARD_LAYOUT_GRID_COLUMNS_COUNT;
            }
            gridRowWidth = sectionItem.sizeForScreen(screen)?.gridWidth;
        }
    }

    return DASHBOARD_LAYOUT_GRID_COLUMNS_COUNT - gridRowWidth;
}

export function getDashboardLayoutWidgetMinGridWidth(widgetType: WidgetType, visType?: VisType): number {
    if (widgetType === "kpi") {
        return KPI_WIDGET_DIMENSIONS_DEFAULT.minWidth;
    }

    let dimension = INSIGHT_WIDGET_DIMENSIONS_TABLE[visType];

    if (!dimension) {
        dimension = INSIGHT_WIDGET_DIMENSIONS_DEFAULT;
    }

    return dimension.minWidth;
}

export function getDashboardLayoutWidgetDefaultGridWidth(widgetType: WidgetType, visType?: VisType): number {
    if (widgetType === "kpi") {
        return KPI_WIDGET_DIMENSIONS_DEFAULT.defWidth;
    }

    let dimension = INSIGHT_WIDGET_DIMENSIONS_TABLE[visType];

    if (!dimension) {
        dimension = INSIGHT_WIDGET_DIMENSIONS_DEFAULT;
    }

    return dimension.defWidth;
}

export function getDashboardLayoutWidgetDefaultHeight(widgetType: WidgetType, visType?: VisType): number {
    if (widgetType === "kpi") {
        return KPI_WIDGET_DIMENSIONS_DEFAULT.defHeightPx;
    }

    let dimension = INSIGHT_WIDGET_DIMENSIONS_TABLE[visType];

    if (!dimension) {
        dimension = INSIGHT_WIDGET_DIMENSIONS_DEFAULT;
    }

    return dimension.defHeightPx;
}
