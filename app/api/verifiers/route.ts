import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { store } from '@/lib/store';

// GET all verifiers
export async function GET(): Promise<NextResponse> {
  try {
    const verifiers = store.getAllVerifiers();
    return NextResponse.json({ verifiers });
  } catch (error: unknown) {
    console.error('Error fetching verifiers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch verifiers' },
      { status: 500 }
    );
  }
}

// POST - Add new verifier (admin only)
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { address, name, adminAddress } = body;

    if (!address || !adminAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: address, adminAddress' },
        { status: 400 }
      );
    }

    // Check if requester is admin
    if (!store.isAdmin(adminAddress)) {
      return NextResponse.json(
        { error: 'Only admins can add verifiers' },
        { status: 403 }
      );
    }

    const success = store.addVerifier({
      address: address,
      name: name || 'Verifier',
      addedAt: Date.now(),
      addedBy: adminAddress,
      active: true,
    });

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to add verifier' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Verifier added successfully' 
    });
  } catch (error: unknown) {
    console.error('Error adding verifier:', error);
    return NextResponse.json(
      { error: 'Failed to add verifier' },
      { status: 500 }
    );
  }
}

// DELETE - Remove verifier (admin only)
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { address, adminAddress } = body;

    if (!address || !adminAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: address, adminAddress' },
        { status: 400 }
      );
    }

    // Check if requester is admin
    if (!store.isAdmin(adminAddress)) {
      return NextResponse.json(
        { error: 'Only admins can remove verifiers' },
        { status: 403 }
      );
    }

    const success = store.removeVerifier(address);

    if (!success) {
      return NextResponse.json(
        { error: 'Verifier not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Verifier removed successfully' 
    });
  } catch (error: unknown) {
    console.error('Error removing verifier:', error);
    return NextResponse.json(
      { error: 'Failed to remove verifier' },
      { status: 500 }
    );
  }
}
