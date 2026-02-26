"use client";

import NextLink from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import React from "react";

/**
 * Compatibility component for Link from react-router-dom
 */
export const Link = ({ to, children, ...props }: any) => {
    const href = to === "/" ? "/" : to;
    return (
        <NextLink href={href} {...props}>
            {children}
        </NextLink>
    );
};

/**
 * Compatibility hook for useNavigate from react-router-dom
 */
export const useNavigate = () => {
    const router = useRouter();

    return (to: string | number, options?: { replace?: boolean; state?: any }) => {
        if (typeof to === "number") {
            if (to === -1) router.back();
            else if (to === 1) router.forward();
            return;
        }

        if (options?.replace) {
            router.replace(to);
        } else {
            router.push(to);
        }
    };
};

/**
 * Compatibility hook for useLocation from react-router-dom
 */
export const useLocation = () => {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    return {
        pathname: pathname || "/",
        search: searchParams ? `?${searchParams.toString()}` : "",
        hash: "",
        state: null,
        key: "default",
    };
};

/**
 * x-link for convenience if needed
 */
export default Link;
