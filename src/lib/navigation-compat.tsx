"use client";

import { Link as RouterLink, useNavigate as useRouterNavigate, useLocation as useRouterLocation, useSearchParams as useRouterSearchParams } from "react-router-dom";
import React from "react";

/**
 * Compatibility component for Link from react-router-dom
 */
export const Link = ({ to, children, ...props }: any) => {
    return (
        <RouterLink to={to} {...props}>
            {children}
        </RouterLink>
    );
};

/**
 * Compatibility hook for useNavigate from react-router-dom
 */
export const useNavigate = () => {
    const navigate = useRouterNavigate();

    return (to: string | number, options?: { replace?: boolean; state?: any }) => {
        if (typeof to === "number") {
            navigate(to);
            return;
        }

        navigate(to, options);
    };
};

/**
 * Compatibility hook for useLocation from react-router-dom
 */
export const useLocation = () => {
    return useRouterLocation();
};

/**
 * Compatibility hook for useSearchParams from react-router-dom
 */
export const useSearchParams = () => {
    return useRouterSearchParams();
};

/**
 * x-link for convenience if needed
 */
export default Link;
