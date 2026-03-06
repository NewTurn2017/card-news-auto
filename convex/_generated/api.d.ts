/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions_apiKeys from "../actions/apiKeys.js";
import type * as actions_collect from "../actions/collect.js";
import type * as actions_generate from "../actions/generate.js";
import type * as actions_images from "../actions/images.js";
import type * as actions_savedUrls from "../actions/savedUrls.js";
import type * as auth from "../auth.js";
import type * as generationPresets from "../generationPresets.js";
import type * as http from "../http.js";
import type * as lib_crypto from "../lib/crypto.js";
import type * as projects from "../projects.js";
import type * as savedUrlFolders from "../savedUrlFolders.js";
import type * as savedUrls from "../savedUrls.js";
import type * as slides from "../slides.js";
import type * as sources from "../sources.js";
import type * as storage from "../storage.js";
import type * as stylePresets from "../stylePresets.js";
import type * as userProfiles from "../userProfiles.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "actions/apiKeys": typeof actions_apiKeys;
  "actions/collect": typeof actions_collect;
  "actions/generate": typeof actions_generate;
  "actions/images": typeof actions_images;
  "actions/savedUrls": typeof actions_savedUrls;
  auth: typeof auth;
  generationPresets: typeof generationPresets;
  http: typeof http;
  "lib/crypto": typeof lib_crypto;
  projects: typeof projects;
  savedUrlFolders: typeof savedUrlFolders;
  savedUrls: typeof savedUrls;
  slides: typeof slides;
  sources: typeof sources;
  storage: typeof storage;
  stylePresets: typeof stylePresets;
  userProfiles: typeof userProfiles;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
