import { RouteObject } from 'react-router-dom';
import React from 'react';

/**
 * Defines the structure for a navigation item that a plugin can add to the main sidebar.
 */
export interface PluginNavItem {
  label: string;
  path: string;
  icon?: React.ComponentType<{ size: number }>;
}

/**
 * The core interface that every Allma plugin must implement.
 * This contract allows a plugin to deeply integrate into the admin shell.
 */
export interface AllmaPlugin {
  /**
   * A unique, reverse-domain identifier for the plugin.
   * @example "com.allma.core.dashboard"
   */
  id: string;

  /**
   * The human-readable name of the plugin.
   * @example "Dashboard"
   */
  name: string;

  /**
   * A function that returns an array of React Router route objects.
   * These routes will be integrated into the main application router.
   */
  getRoutes?: () => RouteObject[];

  /**
   * A function that returns an array of navigation items to be added to the sidebar.
   */
  getNavItems?: () => PluginNavItem[];

  /**
   * An advanced feature allowing a plugin to wrap the entire application in a component.
   * This is useful for providing global React Contexts (e.g., for state management).
   * Wrappers are composed, so the order of plugins matters.
   */
  AppWrapper?: React.ComponentType<{ children: React.ReactNode }>;

  /**
   * An advanced feature allowing a plugin to render a component in a designated UI slot.
   * This example provides a slot in the main application header.
   */
  HeaderWidget?: React.ComponentType;
}
