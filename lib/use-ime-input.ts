import { useState, useRef, useCallback } from "react";

/**
 * Hook for handling Chinese (or other IME) composition safely.
 * 
 * Problem: When composing with IME (e.g., Zhuyin), onChange fires with incomplete characters.
 * If we update state directly, React re-renders and overwrites the input, breaking composition.
 * 
 * Solution:
 * - During composition: keep draft value locally, don't update main state
 * - On compositionEnd: sync the final value from input to state
 * - On change when not composing: update both draft and main state immediately
 */
export function useImeInput(initialValue: string = "") {
  const [value, setValue] = useState(initialValue);
  const [draft, setDraft] = useState(initialValue);
  const isComposingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  const handleCompositionStart = useCallback(() => {
    isComposingRef.current = true;
  }, []);

  const handleCompositionEnd = useCallback(
    (event: React.CompositionEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      isComposingRef.current = false;
      // Get the final value after IME selection
      const finalValue = event.currentTarget.value;
      setDraft(finalValue);
      setValue(finalValue);
    },
    []
  );

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const nextValue = event.currentTarget.value;
      setDraft(nextValue);

      // Only update main state if not composing
      // This prevents React from re-rendering and breaking IME input
      if (!isComposingRef.current) {
        setValue(nextValue);
      }
    },
    []
  );

  const isComposing = useCallback(
    (event?: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const nativeEvent = event?.nativeEvent as KeyboardEvent | undefined;
      return (
        isComposingRef.current ||
        nativeEvent?.isComposing === true ||
        nativeEvent?.keyCode === 229
      );
    },
    []
  );

  const syncValue = useCallback((newValue: string) => {
    setValue(newValue);
    setDraft(newValue);
  }, []);

  return {
    value,
    draft,
    inputRef,
    isComposing,
    syncValue,
    setValue,
    setDraft,
    inputProps: {
      ref: inputRef,
      value: draft, // Use draft for controlled input to show live composition
      onChange: handleChange,
      onCompositionStart: handleCompositionStart,
      onCompositionEnd: handleCompositionEnd,
    },
  };
}
