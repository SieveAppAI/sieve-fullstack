'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const CATEGORIES = ['food', 'supplement', 'cosmetic'] as const;
const MARKETS = [{ code: 'SG', label: 'Singapore' }] as const;

export default function NewProductPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [subcategory, setSubcategory] = useState('');
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>(['SG']);
  const [ingredientsText, setIngredientsText] = useState('');
  const [claimsText, setClaimsText] = useState('');

  function toggleMarket(code: string) {
    setSelectedMarkets((prev) =>
      prev.includes(code)
        ? prev.filter((m) => m !== code)
        : [...prev, code]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const ingredients = ingredientsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const claims = claimsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const res = await fetch('/api/v1/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          category,
          subcategory: subcategory || undefined,
          target_markets: selectedMarkets,
          ingredients,
          claims,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to create product');
      }

      const { product } = await res.json();
      router.push(`/products/${product.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Something went wrong');
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; Back to Dashboard
        </Link>
      </div>

      <h1 className="mb-8 text-2xl font-bold text-gray-900">
        New Product Assessment
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Product Name */}
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700"
          >
            Product Name
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
            placeholder="e.g. Organic Green Tea Extract Capsules"
          />
        </div>

        {/* Category */}
        <div>
          <label
            htmlFor="category"
            className="block text-sm font-medium text-gray-700"
          >
            Category
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Subcategory */}
        <div>
          <label
            htmlFor="subcategory"
            className="block text-sm font-medium text-gray-700"
          >
            Subcategory{' '}
            <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <input
            id="subcategory"
            type="text"
            value={subcategory}
            onChange={(e) => setSubcategory(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
            placeholder="e.g. herbal supplement"
          />
        </div>

        {/* Target Markets */}
        <fieldset>
          <legend className="block text-sm font-medium text-gray-700">
            Target Markets
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {MARKETS.map((market) => {
              const selected = selectedMarkets.includes(market.code);
              return (
                <button
                  key={market.code}
                  type="button"
                  onClick={() => toggleMarket(market.code)}
                  className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                    selected
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {market.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Ingredients */}
        <div>
          <label
            htmlFor="ingredients"
            className="block text-sm font-medium text-gray-700"
          >
            Ingredients{' '}
            <span className="font-normal text-gray-400">(one per line)</span>
          </label>
          <textarea
            id="ingredients"
            rows={6}
            value={ingredientsText}
            onChange={(e) => setIngredientsText(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
            placeholder={
              'Green Tea Extract\nMagnesium Stearate\nHypromellose'
            }
          />
        </div>

        {/* Claims */}
        <div>
          <label
            htmlFor="claims"
            className="block text-sm font-medium text-gray-700"
          >
            Claims{' '}
            <span className="font-normal text-gray-400">(one per line)</span>
          </label>
          <textarea
            id="claims"
            rows={4}
            value={claimsText}
            onChange={(e) => setClaimsText(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
            placeholder={
              'Supports healthy metabolism\nRich in antioxidants'
            }
          />
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-6">
          <Link
            href="/dashboard"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create Product'}
          </button>
        </div>
      </form>
    </div>
  );
}
