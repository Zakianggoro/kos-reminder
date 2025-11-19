import { NextResponse } from 'next/server';
import { getCustomers, addCustomer } from '@/lib/googleSheets';

export async function GET() {
  const customers = await getCustomers();
  return NextResponse.json(customers);
}

export async function POST(request) {
  const body = await request.json();
  const result = await addCustomer(body);
  return NextResponse.json(result);
}