import { NextResponse } from 'next/server';
import { updatePaymentStatus, deleteCustomer } from '@/lib/googleSheets';

export async function PATCH(request, { params }) {
  const { id } = params;
  const { monthlyPayments } = await request.json();
  
  const result = await updatePaymentStatus(parseInt(id), monthlyPayments);
  return NextResponse.json(result);
}

export async function DELETE(request, { params }) {
  const { id } = params;
  const result = await deleteCustomer(parseInt(id));
  return NextResponse.json(result);
}