// (C) 2007-2020 GoodData Corporation
import React, { useLayoutEffect, useRef, useState } from "react";
import debounce from "lodash/debounce";
import isNumber from "lodash/isNumber";

/**
 * @internal
 */
export interface IResponsiveTextProps {
    tagName?: "div" | "span" | "h1" | "h2" | "h3" | "h4" | "h5" | "p" | "dt";
    tagClassName?: string;
    windowResizeRefreshDelay?: number;
    title?: string;
    window?: {
        addEventListener: Window["addEventListener"];
        getComputedStyle: Window["getComputedStyle"];
        removeEventListener: Window["removeEventListener"];
    };
    children?: React.ReactNode;
}

/**
 * @internal
 */
export const ResponsiveText: React.FC<IResponsiveTextProps> = ({
    tagName: Tag = "div",
    tagClassName,
    title,
    children,
    windowResizeRefreshDelay = 50,
    window: windowInstance = window,
}) => {
    const [fontSize, setFontSize] = useState<number | null>(null);
    const containerRef = useRef<HTMLDivElement>();

    const adjustFontSize = () => {
        if (!containerRef.current) {
            return;
        }

        const currentStyle = windowInstance.getComputedStyle(containerRef.current, null);
        const currentFontSize = parseFloat(currentStyle.fontSize);

        if (isNumber(currentFontSize)) {
            const { scrollWidth } = containerRef.current;
            const width = containerRef.current.getBoundingClientRect().width;

            const ratio = Math.round(width) / scrollWidth;
            const size = Math.floor(currentFontSize * ratio);
            setFontSize(size);
        }
    };

    useLayoutEffect(() => {
        const handleWindowResize = debounce(() => {
            // reset font size so that we can read the default fontSize in adjustFontSize later
            setFontSize(null);
        }, windowResizeRefreshDelay);

        windowInstance.addEventListener("resize", handleWindowResize);

        return () => windowInstance.removeEventListener("resize", handleWindowResize);
    }, [windowResizeRefreshDelay]);

    useLayoutEffect(() => {
        // reset font size so that we can read the default fontSize in adjustFontSize later
        setFontSize(null);
    }, [children, tagClassName]);

    useLayoutEffect(() => {
        if (!fontSize) {
            // then adjust the font again
            adjustFontSize();
        }
    }, [fontSize]);

    return (
        <Tag
            className={tagClassName}
            ref={containerRef}
            style={fontSize ? { fontSize: `${fontSize}px` } : undefined}
            title={title}
        >
            {children}
        </Tag>
    );
};
