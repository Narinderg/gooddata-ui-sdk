// (C) 2021 GoodData Corporation

import { FluidLayoutCustomizer } from "../fluidLayoutCustomizer";
import { IDashboardLayout, IDashboardLayoutItem, IDashboardLayoutSection } from "@gooddata/sdk-backend-spi";
import { ExtendedDashboardWidget, ICustomWidget, newCustomWidget } from "../../../model";
import { DashboardCustomizationLogger } from "../customizationLogging";

const EmptyLayout: IDashboardLayout<ExtendedDashboardWidget> = {
    type: "IDashboardLayout",
    sections: [],
};

const LayoutWithOneSection: IDashboardLayout<ExtendedDashboardWidget> = {
    type: "IDashboardLayout",
    sections: [
        {
            type: "IDashboardLayoutSection",
            items: [],
        },
    ],
};

function createTestItem(widget: ICustomWidget): IDashboardLayoutItem<ICustomWidget> {
    return {
        type: "IDashboardLayoutItem",
        size: {
            xl: {
                gridWidth: 12,
            },
        },
        widget,
    };
}

// note: the tests here are minimal; the fluid customizer defers all heavy lifting to layout builder which
// has its own battery of tests
describe("fluid layout customizer", () => {
    let Customizer: FluidLayoutCustomizer;

    beforeEach(() => {
        Customizer = new FluidLayoutCustomizer(new DashboardCustomizationLogger());
    });

    it("should add new section with custom widgets", () => {
        const newSection: IDashboardLayoutSection<ICustomWidget> = {
            type: "IDashboardLayoutSection",
            items: [
                createTestItem(newCustomWidget("1", "custom1")),
                createTestItem(newCustomWidget("2", "custom1")),
            ],
        };

        Customizer.addSection(-1, newSection);

        const updatedEmptyLayout = Customizer.applyTransformations(EmptyLayout);
        expect(updatedEmptyLayout.sections[0]).toEqual(newSection);

        const updatedNonEmptyLayout = Customizer.applyTransformations(LayoutWithOneSection);
        expect(updatedNonEmptyLayout.sections[1]).toEqual(newSection);
    });

    it("should not add empty section", () => {
        const emptySection: IDashboardLayoutSection<ICustomWidget> = {
            type: "IDashboardLayoutSection",
            items: [],
        };

        Customizer.addSection(-1, emptySection);

        const updatedEmptyLayout = Customizer.applyTransformations(EmptyLayout);
        expect(updatedEmptyLayout.sections.length).toEqual(0);
    });

    it("should not add section with item that has no widget", () => {
        const sectionWithBadItem: IDashboardLayoutSection<ICustomWidget> = {
            type: "IDashboardLayoutSection",
            items: [
                {
                    type: "IDashboardLayoutItem",
                    size: {
                        xl: {
                            gridWidth: 6,
                        },
                    },
                },
                createTestItem(newCustomWidget("1", "custom1")),
            ],
        };

        Customizer.addSection(-1, sectionWithBadItem);

        const updatedEmptyLayout = Customizer.applyTransformations(EmptyLayout);
        expect(updatedEmptyLayout.sections.length).toEqual(0);
    });

    it("should add new item into an existing section", () => {
        const item = createTestItem(newCustomWidget("1", "custom1"));

        Customizer.addItem(0, -1, item);
        const updatedNonEmptyLayout = Customizer.applyTransformations(LayoutWithOneSection);

        expect(updatedNonEmptyLayout.sections[0].items).toEqual([item]);
    });

    it("should not add item without widget", () => {
        Customizer.addItem(0, -1, {
            type: "IDashboardLayoutItem",
            size: {
                xl: {
                    gridWidth: 6,
                },
            },
        });

        const updatedNonEmptyLayout = Customizer.applyTransformations(LayoutWithOneSection);
        expect(updatedNonEmptyLayout.sections[0]).toEqual(LayoutWithOneSection.sections[0]);
    });

    it("should first add new items then new sections", () => {
        const newSection: IDashboardLayoutSection<ICustomWidget> = {
            type: "IDashboardLayoutSection",
            items: [createTestItem(newCustomWidget("1", "custom1"))],
        };
        const newItem = createTestItem(newCustomWidget("2", "custom1"));

        Customizer.addSection(0, newSection);
        Customizer.addItem(0, -1, newItem);

        const updatedNonEmptyLayout = Customizer.applyTransformations(LayoutWithOneSection);

        expect(updatedNonEmptyLayout.sections[0]).toEqual(newSection);
        expect(updatedNonEmptyLayout.sections[1].items).toEqual([newItem]);
    });
});
