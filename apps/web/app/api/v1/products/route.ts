import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient, type Json } from '@sieve/db';
import { createSupabaseServer } from '@sieve/db/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const userId = request.nextUrl.searchParams.get('user_id');

    let query = supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: products, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch latest compliance check for each product
    const productIds = products.map((p) => p.id);

    if (productIds.length === 0) {
      return NextResponse.json({ products: [] });
    }

    const { data: checks, error: checksError } = await supabase
      .from('compliance_checks')
      .select('*')
      .in('product_id', productIds)
      .order('checked_at', { ascending: false });

    if (checksError) {
      return NextResponse.json({ error: checksError.message }, { status: 500 });
    }

    // Group by product_id, keep only the latest check per product
    const latestCheckByProduct = new Map<string, (typeof checks)[0]>();
    for (const check of checks) {
      if (check.product_id && !latestCheckByProduct.has(check.product_id)) {
        latestCheckByProduct.set(check.product_id, check);
      }
    }

    const productsWithStatus = products.map((product) => ({
      ...product,
      latest_check: latestCheckByProduct.get(product.id) ?? null,
    }));

    return NextResponse.json({ products: productsWithStatus });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();

    // Get authenticated user
    const authClient = await createSupabaseServer();
    const { data: { user } } = await authClient.auth.getUser();

    const body = await request.json();

    const { name, category, subcategory, ingredients, claims, target_markets } =
      body as {
        name: string;
        category: string;
        subcategory?: string;
        ingredients: string[];
        claims: string[];
        target_markets: string[];
      };

    if (!name || !category || !ingredients?.length || !target_markets?.length) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: name, category, ingredients, target_markets',
        },
        { status: 400 },
      );
    }

    const formulation = {
      ingredients: ingredients.map((name) => ({ name })),
    } as unknown as Json;

    const { data, error } = await supabase
      .from('products')
      .insert({
        name,
        category,
        subcategory: subcategory ?? null,
        formulation,
        claims: claims ?? [],
        target_markets,
        user_id: user?.id ?? null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ product: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
