# AGENTS.md

Corva.AI platform UI app — a React dashboard widget scaffolded by `create-corva-app`.
Deployed to the Corva platform via `yarn release`.

## Critical Rules

These constraints are enforced by the platform. Violating them breaks the build or runtime.

1. **Root export** — `src/index.js` MUST default-export `{ component: App, settings: AppSettings }`. The component may also be a `ParentApp` wrapper (e.g., `{ component: ParentApp, settings: AppSettings }`) that wraps `App` with Context.Providers and prop initialization. This is the platform loader contract.
2. **UI components** — Use only `@corva/ui` components. Import from `@corva/ui/componentsV2`; fall back to `@corva/ui/components` only when a V2 version doesn't exist yet. `@material-ui/core` v4 is available as the underlying library.
3. **HTTP clients** — Use `corvaDataAPI` / `corvaAPI` from `@corva/ui/clients` for all network requests.
4. **Do not rename or delete** `App.tsx`, `AppSettings.tsx`, or `index.js` — they are platform entry points.

## Project Structure

```
src/
  App.tsx              — Main app component (default export required)
  AppSettings.tsx      — Settings panel component (default export required)
  index.js             — Root export: { component, settings }
  constants.ts         — Default settings values
  types.ts             — Custom app settings interface
  custom.d.ts          — Module declarations for CSS/SVG imports
  App.scss             — Component styles (SCSS modules)
  __tests__/           — Jest test files
  __mocks__/mockData.ts — Mock data for tests
  assets/              — Static assets (SVGs, images)
config/jest/           — Jest setup (setupTests, transforms)
config-overrides.js    — Webpack 5 customization
tsconfig.json          — TypeScript configuration
manifest.json          — Corva platform app metadata (generated at scaffold time)
```

## Key Patterns

### Component Structure

- Use `useAppCommons()` from `@corva/ui/effects` to access platform data: `appKey`, `appSettings`, `well`, `rig`, `fracFleet`, `wells`, `currentUser`, `onSettingChange`, `onSettingsChange`, etc.
- Define custom app settings shape in `src/types.ts` (`CustomAppSettings`).
- Platform types (Well, Rig, FracFleet, User, etc.) are typed in `@corva/ui` — do NOT duplicate them.

```typescript
// App component pattern — use useAppCommons() instead of props
const App = () => {
  const { appKey, well, rig, appSettings } = useAppCommons();
  const { isExampleCheckboxChecked } = appSettings || {};
  // ...
};

// AppSettings component pattern — same hook
const AppSettings = () => {
  const { appSettings, onSettingChange } = useAppCommons();
  // ...
};
```

### Styling

The preferred way to write styles is SCSS (`.scss` files).

Every `.scss` file must import the shared utilities:

```scss
@import '@corva/ui/styles/common';
```

This provides all functions, variables, and mixins below.

For custom shared variables or mixins specific to the project, create a `src/styles/` directory (e.g. `_variables.scss`, `_common.scss`) and import them alongside the `@corva/ui` import.

**`spacing($top, $right?, $bottom?, $left?)`** — 8px base unit:

```scss
padding: spacing(2); // 16px
margin: spacing(1, 0); // 8px 0
gap: spacing(0.5); // 4px
padding: spacing(2, 1, 2, 1); // 16px 8px 16px 8px
```

**`colorAlpha($color, $opacity)`** — transparency:

```scss
background: colorAlpha($palette_t1, 0.08); // white at 8% opacity
border: 1px solid colorAlpha($palette_t1, 0.12);
```

**`transition($properties...)`** — standard `cubic-bezier(0.4, 0, 0.2, 1) 0.15s`:

```scss
transition: transition(opacity);
transition: transition(color, background-color);
```

**Full example:**

```scss
@import '@corva/ui/styles/common';

.container {
  padding: spacing(2);
  background: $palette_b5;
  color: $palette_t1;
  transition: transition(opacity, background-color);

  &:hover {
    background: colorAlpha($palette_t1, 0.08);
  }
}

.label {
  color: $palette_t7;
  font-size: 12px;
}
```

**Import in component:**

```typescript
import styles from './App.scss';
// Use: <div className={styles.container}>
```

**Colors & Theming:**

NEVER hardcode color values (hex, rgb, hsl). Always use `@corva/ui` theme colors:

- In SCSS: use SCSS variables from `@corva/ui/styles/common` like `$palette_t1`, `$palette_b5`, `$palette_t7`
- Use `colorAlpha($color, $opacity)` for transparency instead of raw `rgba()`
- Run MCP tool `get_theme_docs` (section: "variables") to see all available theme variables
- Run MCP tool `get_theme_docs` (section: "palette") to see available palette colors with hex values

**Rules:**

- No inline `style={{...}}` unless absolutely necessary for dynamic values
- Use `classnames` for conditional/composed classes, never manual string joins
- No global selectors (tag selectors like `div`, `span`) — use `:global()` only when absolutely necessary
- No `!important`
- Use a descriptive camelCase class as the root selector (e.g. `.toolbar`, `.chartPanel`) instead of generic `.root`

### State Management (Zustand)

The Corva platform can render multiple instances of the same app simultaneously. If a Zustand store is created at module level (singleton), all instances share the same state. To avoid this, always create store instances inside a React Context provider.

**Store factory + context** — create a factory function and a context to hold the store instance:

```typescript
// store/createAppStore.ts
import { createContext } from 'react';
import { create } from 'zustand';

import { AppStore } from '~/types';

export const createAppStore = (initProps?: Partial<SavedSettings>) => {
  return create<AppStore>()((set, get) => ({
    // Compose sub-stores
    ...createSettingsStore(initProps?.settings)(set, get),
    ...createDataStore()(set, get),
  }));
};

export const StoreContext = createContext<ReturnType<typeof createAppStore> | null>(null);
```

**Provider** — create the store once per app mount and pass it via context:

```typescript
// StoreProvider.tsx
import { FC, PropsWithChildren, useState } from 'react';

import { StoreContext, createAppStore } from '~/store/createAppStore';

export const StoreProvider: FC<PropsWithChildren<{ savedSettings: SavedSettings }>> = ({
  children,
  savedSettings,
}) => {
  const [appStore] = useState(() => createAppStore(savedSettings));

  return <StoreContext.Provider value={appStore}>{children}</StoreContext.Provider>;
};
```

**Consumer hooks** — read from context, never from a global store:

```typescript
// hooks/useAppStore.ts
import { useContext } from 'react';
import { useStore } from 'zustand';
import { useStoreWithEqualityFn } from 'zustand/traditional';

import { StoreContext } from '~/store/createAppStore';
import { AppStore } from '~/types';

/** Read a single top-level key from the store. */
export const useAppStore = <T extends keyof AppStore>(key: T): AppStore[T] => {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useAppStore must be used within StoreProvider');
  return useStore(store, state => state[key]);
};

/** Subscribe to a derived value with optional custom equality. */
export const useAppStoreSelector = <R>(
  selector: (state: AppStore) => R,
  equalityFn?: (a: R, b: R) => boolean
): R => {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useAppStoreSelector must be used within StoreProvider');
  return useStoreWithEqualityFn(store, selector, equalityFn);
};
```

**Usage in components:**

```typescript
const isLegendVisible = useAppStore('isLegendVisible');
const selectedChannels = useAppStoreSelector(state => state.selectedChannels);
```

**Wire it up in `ParentApp`** (see full example with `QueryClientProvider` in the Data Fetching section below).

General rules:

- Name stores `use[Name]Store` (e.g., `useWellDataStore`)
- Use selectors: `const value = useAppStore('value')`
- Keep business logic in store actions

### Data Fetching (React Query v4)

Same as Zustand: the platform runs multiple app instances, so each must have its own `QueryClient`. Never create a `QueryClient` at module level — use a hook with `useState` to create it once per mount.

**`useQueryClient` hook** — creates an isolated `QueryClient` per app instance:

```typescript
// hooks/useQueryClient.ts
import { useState } from 'react';
import { QueryCache, QueryClient } from '@tanstack/react-query';
import { showErrorNotification } from '@corva/ui/utils';

export const useQueryClient = () => {
  const [queryClient] = useState(
    new QueryClient({
      queryCache: new QueryCache({
        onError: (error: unknown) => {
          if (typeof error === 'object' && error !== null && 'message' in error) {
            showErrorNotification(`Something went wrong: ${String(error.message)}`);
          }
        },
      }),
      defaultOptions: {
        queries: {
          refetchOnWindowFocus: false,
          refetchOnReconnect: false,
        },
      },
    })
  );

  return queryClient;
};
```

**Wire it up in `ParentApp`** — wrap the app tree with `QueryClientProvider`:

```typescript
import { QueryClientProvider } from '@tanstack/react-query';

const ParentApp = () => {
  const { appSettings, onSettingsChange } = useAppCommons();
  const queryClient = useQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <StoreProvider savedSettings={appSettings?.savedSettings}>
        <App />
      </StoreProvider>
    </QueryClientProvider>
  );
};

export default { component: ParentApp, settings: AppSettings };
```

General rules:

- Encapsulate queries in custom hooks (e.g., `useWellData`)
- Use typed query keys (array format)
- Always handle `isLoading` and `isError` states

## Naming Conventions

- Boolean variables: prefix with `is`, `has`, or `should`
- Non-empty array checks: `!!array.length` (not `array.length > 0`)
- Zustand stores: `use[StoreName]Store`
- TypeScript props: use `interface` (not `type`)

## Testing

- **Framework:** Jest + React Testing Library
- **Wrapper:** Use `AppTestWrapper` from `@corva/ui/testing` to wrap components — it provides `useAppCommons()` context
- **Pattern:** Pass data via `AppTestWrapper` props, render components with no props
- **Mocking:** Mock network requests (jest mocks or msw), never call real APIs
- **Timezone:** UTC is enforced (`process.env.TZ = 'UTC'`)
- **Mocked globals:** `ResizeObserver`, `MutationObserver` (in `setupTests.js`)

```tsx
// Test pattern — data flows through AppTestWrapper context
render(
  <AppTestWrapper appSettings={{ isExampleCheckboxChecked: true }} well={mockWell}>
    <App />
  </AppTestWrapper>
);
```

## Commands

```
yarn start     Dev server at http://app.local.corva.ai:8080/
yarn build     Production bundle
yarn test      Run tests
yarn lint      ESLint check
yarn zip       Create deployment ZIP
yarn release   Release to Corva platform
```

## @corva/ui Documentation

Local documentation for `@corva/ui` is bundled at `node_modules/@corva/ui/docs/`.
Before implementing any UI component, data fetch, or API call, read the relevant doc file:

- **V2 Components:** `node_modules/@corva/ui/docs/01-components-v2/` — Props, examples, usage
- **V1 Components:** `node_modules/@corva/ui/docs/02-components-v1/` — Legacy components reference
- **Hooks:** `node_modules/@corva/ui/docs/03-hooks/` — Parameters, return types, examples
- **API Clients:** `node_modules/@corva/ui/docs/04-clients/` — corvaAPI, corvaDataAPI endpoints
- **Theme:** `node_modules/@corva/ui/docs/05-theme/` — Color palette, CSS variables
- **Utilities:** `node_modules/@corva/ui/docs/06-utilities/` — Helper functions
- **Constants:** `node_modules/@corva/ui/docs/07-constants/` — Platform constants

Start with `node_modules/@corva/ui/docs/README.md` for the full index.
Do NOT guess `@corva/ui` APIs — read the local docs first.

## MCP Server (Interactive Fallback)

The `corva-ui` MCP server is pre-configured (`.mcp.json`, `.cursor/mcp.json`, `.codex/config.toml`).
Use it for interactive queries when the local docs are insufficient or you need to search across components.
