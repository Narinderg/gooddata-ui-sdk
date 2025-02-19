// (C) 2021 GoodData Corporation
import { createSlice } from "@reduxjs/toolkit";
import { uiInitialState } from "./uiState";
import { uiReducers } from "./uiReducers";

const uiSlice = createSlice({
    name: "uiSlice",
    initialState: uiInitialState,
    reducers: uiReducers,
});

export const uiSliceReducer = uiSlice.reducer;

/**
 * Actions to control ui state of the dashboard.
 *
 * @internal
 */
export const uiActions = uiSlice.actions;
