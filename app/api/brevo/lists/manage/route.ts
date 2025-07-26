/**
 * API Route: Brevo List Management
 * GET /api/brevo/lists/manage - Get all lists
 * POST /api/brevo/lists/manage - Create or refresh lists
 */

import { NextRequest, NextResponse } from 'next/server';
import { getListManager } from '@/lib/brevo/list-manager';
import { supabase } from '@/lib/supabase-client';

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const isAdmin = user.user_metadata?.role === 'admin';
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required for list management' },
        { status: 403 }
      );
    }

    const listManager = getListManager();
    const lists = await listManager.getAllLists();

    return NextResponse.json({
      success: true,
      lists,
      total: lists.length,
    });

  } catch (error) {
    console.error('Error in lists management GET API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, listName } = await request.json();

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    // Verify admin access
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const isAdmin = user.user_metadata?.role === 'admin';
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required for list management' },
        { status: 403 }
      );
    }

    const listManager = getListManager();

    switch (action) {
      case 'initialize':
        await listManager.initializeDefaultLists();
        return NextResponse.json({
          success: true,
          message: 'Default lists initialized successfully',
        });

      case 'refresh_single':
        if (!listName) {
          return NextResponse.json(
            { error: 'List name required for refresh_single action' },
            { status: 400 }
          );
        }
        await listManager.refreshDynamicList(listName);
        return NextResponse.json({
          success: true,
          message: `List "${listName}" refreshed successfully`,
        });

      case 'refresh_all':
        await listManager.refreshAllDynamicLists();
        return NextResponse.json({
          success: true,
          message: 'All dynamic lists refreshed successfully',
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: initialize, refresh_single, refresh_all' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error in lists management POST API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}