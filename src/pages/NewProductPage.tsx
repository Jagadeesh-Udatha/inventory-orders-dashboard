import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { productsApi } from '../api/endpoints';
import type { ProductInput } from '../api/types';
import { ErrorBanner } from '../components/ui';

type Form = Record<keyof ProductInput, string>;
const EMPTY: Form = { sku: '', name: '', category: '', price: '', stock: '0' };

/** Same rules as ProductRequest on the server, checked here first so most mistakes never make a round trip. */
export function validateProduct(f: Form): Partial<Form> {
  const e: Partial<Form> = {};
  if (!/^[A-Z0-9-]{3,32}$/.test(f.sku)) e.sku = "must be 3-32 upper-case letters, digits or '-'";
  if (!f.name.trim()) e.name = 'is required';
  else if (f.name.length > 120) e.name = 'must be at most 120 characters';
  if (!f.category.trim()) e.category = 'is required';
  const price = Number(f.price);
  if (!f.price || Number.isNaN(price) || price < 0.01) e.price = 'must be at least 0.01';
  else if (!/^\d{1,9}(\.\d{1,2})?$/.test(f.price)) e.price = 'use at most 2 decimal places';
  const stock = Number(f.stock);
  if (!Number.isInteger(stock) || stock < 0) e.stock = 'must be a whole number, 0 or more';
  return e;
}

export function NewProductPage() {
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Partial<Form>>({});
  const navigate = useNavigate();
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: (input: ProductInput) => productsApi.create(input),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ['products'] });
      navigate(`/products?q=${encodeURIComponent(p.sku)}`);
    },
    onError: (e) => {
      // Server-side field errors (and DUPLICATE_SKU) are shown next to the field they belong to
      if (e instanceof ApiError) {
        if (e.code === 'DUPLICATE_SKU') setErrors({ sku: 'already exists' });
        else setErrors(e.fieldErrors as Partial<Form>);
      }
    },
  });

  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    const found = validateProduct(form);
    setErrors(found);
    if (Object.keys(found).length) return;
    create.mutate({
      sku: form.sku,
      name: form.name.trim(),
      category: form.category.trim().toLowerCase(),
      price: Number(form.price),
      stock: Number(form.stock),
    });
  };

  const field = (key: keyof Form, label: string, props: Record<string, unknown> = {}) => (
    <label className="field">
      <span>{label}</span>
      <input
        value={form[key]}
        aria-invalid={Boolean(errors[key])}
        onChange={(e) => setForm({ ...form, [key]: key === 'sku' ? e.target.value.toUpperCase() : e.target.value })}
        {...props}
      />
      {errors[key] && <small className="field-error">{label} {errors[key]}</small>}
    </label>
  );

  return (
    <section className="narrow">
      <h1>Add product</h1>
      <form onSubmit={submit} noValidate className="card form">
        {field('sku', 'SKU', { placeholder: 'KB-MECH-87', autoFocus: true })}
        {field('name', 'Name', { placeholder: 'Mechanical keyboard, 87 keys' })}
        {field('category', 'Category', { placeholder: 'electronics' })}
        <div className="row">
          {field('price', 'Price (INR)', { inputMode: 'decimal', placeholder: '3499.00' })}
          {field('stock', 'Opening stock', { type: 'number', min: 0 })}
        </div>
        {create.error instanceof ApiError && create.error.code !== 'DUPLICATE_SKU' && !Object.keys(create.error.fieldErrors).length && (
          <ErrorBanner error={create.error} />
        )}
        <div className="form-actions">
          <button className="btn btn-primary" disabled={create.isPending}>{create.isPending ? 'Saving...' : 'Save product'}</button>
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/products')}>Cancel</button>
        </div>
      </form>
    </section>
  );
}
