import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  useKeepSelectedOptions,
  UseKeepSelectedOptionsParams,
} from './use-keep-selected-options';

interface Option {
  id: string;
  name: string;
}

const ACME: Option = { id: 'org-acme', name: 'Acme' };
const GLOBEX: Option = { id: 'org-globex', name: 'Globex' };
const INITECH: Option = { id: 'org-initech', name: 'Initech' };
const UNKNOWN_ID = 'org-unknown';

const getId = ({ id }: Option) => id;

type Params = Omit<UseKeepSelectedOptionsParams<Option>, 'getId'>;

const renderKeepSelectedOptions = (params: Params) =>
  renderHook((props: Params) => useKeepSelectedOptions({ ...props, getId }), {
    initialProps: params,
  });

describe('useKeepSelectedOptions', () => {
  it('should return the options as they are when they hold every selected option', () => {
    // Given
    const options = [ACME, GLOBEX];

    // When
    const { result } = renderKeepSelectedOptions({
      options,
      value: [ACME.id, GLOBEX.id],
    });

    // Then
    expect(result.current).toBe(options);
  });

  it('should keep a selected option once a search drops it from the results', () => {
    // Given
    const { result, rerender } = renderKeepSelectedOptions({
      options: [ACME, GLOBEX],
      value: ACME.id,
    });

    // When
    rerender({ options: [GLOBEX], value: ACME.id });

    // Then
    expect(result.current).toEqual([GLOBEX, ACME]);
  });

  it('should keep every selected option a search dropped, in selection order', () => {
    // Given
    const { result, rerender } = renderKeepSelectedOptions({
      options: [ACME, GLOBEX, INITECH],
      value: [INITECH.id, ACME.id],
    });

    // When
    rerender({ options: [GLOBEX], value: [INITECH.id, ACME.id] });

    // Then
    expect(result.current).toEqual([GLOBEX, INITECH, ACME]);
  });

  it('should keep an option shown before it was selected when the same render drops it', () => {
    // Given
    const { result, rerender } = renderKeepSelectedOptions({
      options: [ACME, GLOBEX],
      value: [],
    });

    // When
    rerender({ options: [GLOBEX], value: [ACME.id] });

    // Then
    expect(result.current).toEqual([GLOBEX, ACME]);
  });

  it('should add a selected option of the initial value that the results lack', () => {
    // When
    const { result } = renderKeepSelectedOptions({
      options: [GLOBEX],
      value: [ACME.id],
      initialOptions: [ACME],
    });

    // Then
    expect(result.current).toEqual([GLOBEX, ACME]);
  });

  it('should prefer the option a search returned over the initial one', () => {
    // Given
    const renamedAcme = { ...ACME, name: 'Acme Corporation' };
    const { result, rerender } = renderKeepSelectedOptions({
      options: [renamedAcme],
      value: ACME.id,
      initialOptions: [ACME],
    });

    // When
    rerender({ options: [GLOBEX], value: ACME.id, initialOptions: [ACME] });

    // Then
    expect(result.current).toEqual([GLOBEX, renamedAcme]);
  });

  it('should add an option only once when it is selected twice', () => {
    // Given
    const { result, rerender } = renderKeepSelectedOptions({
      options: [ACME],
      value: [ACME.id, ACME.id],
    });

    // When
    rerender({ options: [GLOBEX], value: [ACME.id, ACME.id] });

    // Then
    expect(result.current).toEqual([GLOBEX, ACME]);
  });

  it('should leave out a selected id whose option was never seen', () => {
    // Given
    const options = [GLOBEX];

    // When
    const { result } = renderKeepSelectedOptions({
      options,
      value: UNKNOWN_ID,
    });

    // Then
    expect(result.current).toBe(options);
  });

  it('should drop a kept option once it is no longer selected', () => {
    // Given
    const options = [GLOBEX];
    const { result, rerender } = renderKeepSelectedOptions({
      options: [ACME, GLOBEX],
      value: ACME.id,
    });

    // When
    rerender({ options, value: null });

    // Then
    expect(result.current).toBe(options);
  });
});
