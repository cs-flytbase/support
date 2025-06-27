import { NextRequest, NextResponse } from 'next/server';
import { fetchPartnerTransactions } from '@/utils/mongodb';

export async function GET(req: NextRequest, { params }: { params: Promise<{ partner_org_id: string }> }) {
  const log = (...args: any[]) => console.error('[FC-SUMMARY API]', ...args);
  const { partner_org_id } = await params;
  console.log('partner_org_id', partner_org_id);
  if (!partner_org_id) {
    log('Missing partner_org_id in request params');
    return NextResponse.json({ error: 'Missing partner_org_id' }, { status: 400 });
  }

  try {
    // Fetch all transactions for this partner_org_id
    let transactions;
    try {
      transactions = await fetchPartnerTransactions(partner_org_id);
    } catch (err: any) {
      log('Error fetching partner transactions from MongoDB:', err);
      return NextResponse.json({ error: 'Failed to fetch transactions from MongoDB', details: err?.message || err }, { status: 500 });
    }

    if (!Array.isArray(transactions)) {
      log('MongoDB returned non-array for transactions:', transactions);
      return NextResponse.json({ error: 'Invalid data from MongoDB' }, { status: 500 });
    }

    const filtered = transactions.filter((t: any) => t.partner_org_id === partner_org_id);

    // Aggregate
    let fcBought = 0;
    let fcConsumed = 0;
    let fcConsumedMTD = 0;
    let fcConsumedYTD = 0;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    for (const t of filtered) {
      try {
        const createdAt = new Date(t.created_at);
        if (t.transaction_type === 'Credit') {
          fcBought += t.value;
        } else if (t.transaction_type === 'Debit') {
          fcConsumed += t.value;
          if (createdAt >= startOfMonth && createdAt <= now) {
            fcConsumedMTD += t.value;
          }
          if (createdAt >= startOfYear && createdAt <= now) {
            fcConsumedYTD += t.value;
          }
        }
      } catch (aggErr: any) {
        log('Error aggregating transaction:', t, aggErr);
      }
    }

    const fcRemaining = fcBought - fcConsumed;
    console.log('fcRemaining', fcRemaining);
    console.log('fcBought', fcBought);
    console.log('fcConsumed', fcConsumed);
    console.log('fcConsumedMTD', fcConsumedMTD);
    console.log('fcConsumedYTD', fcConsumedYTD);
    return NextResponse.json({
      fcRemaining,
      fcBought,
      fcConsumed,
      fcConsumedMTD,
      fcConsumedYTD,
    });
  } catch (error: any) {
    log('Unexpected error in FC summary API:', error);
    return NextResponse.json({ error: 'Unexpected error', details: error?.message || error }, { status: 500 });
  }
}
