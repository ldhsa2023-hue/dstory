import { NextResponse } from 'next/server';
import { getAsset, setAssetIngredient } from '../../../../../../lib/db/repo';

export async function PATCH(req, { params }) {
  const body = await req.json().catch(() => ({}));
  const asset = getAsset(params.id);
  if (!asset) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const updated = setAssetIngredient(params.id, {
    isIngredient: body.isIngredient,
    ingredientName: body.ingredientName,
    ingredientType: body.ingredientType,
  });
  return NextResponse.json(updated);
}
