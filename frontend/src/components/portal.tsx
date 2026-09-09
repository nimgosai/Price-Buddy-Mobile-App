import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { StyleSheet, View } from "react-native";

/**
 * Lightweight root portal. Renders overlay content at the app root INSIDE the
 * same native window (not a React Native <Modal>, which spawns a separate
 * Android window). Keeping text inputs in the same window as the KeyboardProvider
 * avoids the New Architecture multiline TextInput input-lag/rendering bug that
 * only reproduces on-device.
 *
 * Uses an external store so mounting/updating a portal re-renders ONLY the
 * outlet — never the whole app subtree (which would cause an update loop).
 */

type PortalStore = {
  nodes: Map<string, ReactNode>;
  listeners: Set<() => void>;
  version: number;
};

type PortalApi = {
  set: (key: string, node: ReactNode) => void;
  remove: (key: string) => void;
};

const PortalContext = createContext<PortalApi | null>(null);

export function PortalProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<PortalStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = { nodes: new Map(), listeners: new Set(), version: 0 };
  }
  const store = storeRef.current;

  const apiRef = useRef<PortalApi | null>(null);
  if (!apiRef.current) {
    const emit = () => store.listeners.forEach((l) => l());
    apiRef.current = {
      set: (key, node) => {
        store.nodes.set(key, node);
        store.version += 1;
        emit();
      },
      remove: (key) => {
        if (store.nodes.delete(key)) {
          store.version += 1;
          emit();
        }
      },
    };
  }

  return (
    <PortalContext.Provider value={apiRef.current}>
      {children}
      <PortalOutlet store={store} />
    </PortalContext.Provider>
  );
}

function PortalOutlet({ store }: { store: PortalStore }) {
  const subscribe = useCallback(
    (cb: () => void) => {
      store.listeners.add(cb);
      return () => store.listeners.delete(cb);
    },
    [store],
  );
  useSyncExternalStore(
    subscribe,
    () => store.version,
    () => store.version,
  );

  return (
    <>
      {Array.from(store.nodes.entries()).map(([key, node]) => (
        <View key={key} style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {node}
        </View>
      ))}
    </>
  );
}

export function Portal({ children }: { children: ReactNode }) {
  const api = useContext(PortalContext);
  const id = useId();

  // Push the latest content on every commit — this only re-renders the outlet.
  useEffect(() => {
    api?.set(id, children);
  });

  // Remove on unmount.
  useEffect(() => () => api?.remove(id), [api, id]);

  return null;
}
