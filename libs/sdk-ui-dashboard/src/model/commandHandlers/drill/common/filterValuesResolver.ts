// (C) 2021 GoodData Corporation

import invariant from "ts-invariant";
import isEmpty from "lodash/isEmpty";
import {
    attributeElementsCount,
    filterAttributeElements,
    filterObjRef,
    IAttributeFilter,
    IDateFilter,
    isAbsoluteDateFilter,
    isDateFilter,
    objRefToString,
    isAttributeFilter,
    IRelativeDateFilter,
    isObjRef,
} from "@gooddata/sdk-model";
import { IAnalyticalBackend, IAttributeElement } from "@gooddata/sdk-backend-spi";

import {
    IResolvedAttributeFilterValues,
    IResolvedFilterValues,
    ResolvableFilter,
    IResolvedDateFilterValue,
} from "../../../types/commonTypes";

const MAX_ELEMENTS_COUNT_PER_REQUEST = 500; // should cover all attribute filters created by UI where we have 500 elements limit

/**
 * Resolves filter values
 *
 * @param filters - Filters with resolvable values
 *  = all selected elements of attribute filter
 *  + from/to limits of relative date filter
 *  + from/to limits of absolute date filter
 * @returns Map of resolved filter values per filter's identifier (date dimension ref or attribute DF ref)
 * @alpha
 */
export async function resolveFilterValues(
    filters: ResolvableFilter[],
    backend?: IAnalyticalBackend,
    workspace?: string,
): Promise<IResolvedFilterValues> {
    const promises: Promise<IResolvedDateFilterValue | IResolvedAttributeFilterValues>[] = filters.map(
        (filter) => {
            if (isAbsoluteDateFilter(filter)) {
                return new Promise<IResolvedDateFilterValue>((resolve) =>
                    resolve({
                        from: filter.absoluteDateFilter.from,
                        to: filter.absoluteDateFilter.to,
                    }),
                );
            }

            invariant(backend, `backend needs to be provided for this type of filter: ${filter}`);
            invariant(workspace, `workspace needs to be provided for this type of filter: ${filter}`);
            if (isAttributeFilter(filter)) {
                return resolveAttributeFilterValues(filter, backend, workspace);
            } else {
                return resolveRelativeDateFilterValues(filter, backend, workspace);
            }
        },
    );
    return Promise.all(promises).then((resolvedValues) => {
        const resolvedValuesMap: IResolvedFilterValues = {
            dateFilters: [],
            attributeFilters: {},
        };
        return resolvedValues.reduce((result, _resolvedValue, index): IResolvedFilterValues => {
            const filter = filters[index];
            const ref = filterObjRef(filter);
            invariant(ref, `filter without reference not supported: ${filter}`);
            if (isDateFilter(filter)) {
                const value = getResolvedFilterValues(resolvedValues, filter, index);
                value && result.dateFilters.push(value);
            }
            if (isAttributeFilter(filter)) {
                const refString = objRefToString(ref);
                const value = getResolvedFilterValues(resolvedValues, filter, index);
                if (value) {
                    result.attributeFilters[refString] = value;
                }
            }
            return result;
        }, resolvedValuesMap);
    });
}

async function resolveRelativeDateFilterValues(
    filter: IRelativeDateFilter,
    backend: IAnalyticalBackend,
    workspace: string,
) {
    let foundDayDisplayForm;
    if (isObjRef(filter.relativeDateFilter.dataSet)) {
        const dataSet = await backend
            ?.workspace(workspace)
            .catalog()
            .forDataset(filter.relativeDateFilter.dataSet)
            .load();

        if (dataSet.dateDatasets) {
            const dateDataSetAttributes = dataSet.dateDatasets()[0].dateAttributes;
            const foundDayAttribute = dateDataSetAttributes.find(
                (dateDataSetAttr) => dateDataSetAttr.granularity === "GDC.time.date",
            );
            foundDayDisplayForm = foundDayAttribute && foundDayAttribute.defaultDisplayForm;
        }
    }

    const attributesService = backend.workspace(workspace).attributes();
    const elementsQuery = attributesService.elements().forFilter(filter, foundDayDisplayForm?.ref);
    const elements = await elementsQuery.query();
    // check for next page to see if we need to use skipped response
    const hasNextPage = elements.limit + elements.offset < elements.totalCount;
    // last page of the response to get last element
    const result = hasNextPage
        ? await elements.goTo(Math.ceil(elements.totalCount / elements.limit) - 1)
        : elements;

    return {
        from: elements.items[0].title,
        to: getLastTitle(result.items),
    };
}

async function resolveAttributeFilterValues(
    filter: IAttributeFilter,
    backend: IAnalyticalBackend,
    workspace: string,
): Promise<IResolvedAttributeFilterValues> {
    const result: IResolvedAttributeFilterValues = {};
    const attributesService = backend.workspace(workspace).attributes();
    const elementsQuery = attributesService.elements().forFilter(filter);
    const selectedElements = filterAttributeElements(filter);
    const selectedElementsCount = attributeElementsCount(selectedElements);
    // nothing to resolve at all (eg. ALL filter)
    if (selectedElementsCount === 0) {
        return result;
    }
    const requestLimit = Math.min(selectedElementsCount, MAX_ELEMENTS_COUNT_PER_REQUEST);
    let elementsPage = await elementsQuery.withLimit(requestLimit).query();
    const elements: IAttributeElement[] = [];

    while (!isEmpty(elementsPage.items)) {
        elements.push(...elementsPage.items);
        elementsPage = await elementsPage.next();
    }
    return elements.reduce((map, element) => {
        map[element.uri] = element.title;
        return map;
    }, result);
}

// to handle the fact, that array of promises' results is combining two different types
function getResolvedFilterValues(
    array: (IResolvedDateFilterValue | IResolvedAttributeFilterValues)[],
    filter: IAttributeFilter,
    index: number,
): IResolvedAttributeFilterValues | undefined;
function getResolvedFilterValues(
    array: (IResolvedDateFilterValue | IResolvedAttributeFilterValues)[],
    filter: IDateFilter,
    index: number,
): IResolvedDateFilterValue | undefined;
function getResolvedFilterValues(
    array: (IResolvedDateFilterValue | IResolvedAttributeFilterValues)[],
    filter: IAttributeFilter | IDateFilter,
    index: number,
): IResolvedAttributeFilterValues | IResolvedDateFilterValue | undefined {
    if (isDateFilter(filter)) {
        return array[index];
    }
    return array[index];
}

function getLastTitle(items: IAttributeElement[]): string {
    return items[items.length - 1].title;
}
