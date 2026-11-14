import type { APIRoute } from 'astro';
import { ChargeInputError, createCharge, parseNewCharge } from '../../../lib/charges';
import { PeyError } from '../../../lib/pey';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const input = parseNewCharge(await request.json().catch(() => null));
    const charge = await createCharge(input);
    return Response.json(charge, { status: 201 });
  } catch (error) {
    if (error instanceof ChargeInputError) return Response.json({ error: error.message }, { status: 400 });
    if (error instanceof PeyError) {
      console.error('pey', error.status, error.body);
      return Response.json({ error: 'No se pudo crear el cobro.' }, { status: 502 });
    }
    console.error(error);
    return Response.json({ error: 'No se pudo crear el cobro.' }, { status: 500 });
  }
};
