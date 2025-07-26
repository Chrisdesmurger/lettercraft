/**
 * API Route: Brevo Job Status Management
 * GET /api/brevo/jobs/status?jobId=xxx - Get specific job status
 * GET /api/brevo/jobs/status - Get all jobs with filtering
 */

import { NextRequest, NextResponse } from 'next/server';
import { getJobQueue } from '@/lib/brevo/job-queue';
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
        { error: 'Admin access required for job management' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const status = searchParams.get('status') as any;
    const jobType = searchParams.get('jobType') as any;
    const limit = searchParams.get('limit');

    const jobQueue = getJobQueue();

    if (jobId) {
      // Get specific job
      const job = await jobQueue.getJobStatus(jobId);
      
      if (!job) {
        return NextResponse.json(
          { error: 'Job not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ job });
    } else {
      // Get all jobs with filtering
      const jobs = await jobQueue.getJobs({
        status,
        jobType,
        limit: limit ? parseInt(limit) : undefined,
      });

      const stats = await jobQueue.getQueueStats();

      return NextResponse.json({
        jobs,
        stats,
        total: jobs.length,
      });
    }
  } catch (error) {
    console.error('Error in job status API:', error);
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
    const { action, jobId } = await request.json();

    if (!action || !jobId) {
      return NextResponse.json(
        { error: 'Action and jobId are required' },
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
        { error: 'Admin access required for job management' },
        { status: 403 }
      );
    }

    const jobQueue = getJobQueue();

    switch (action) {
      case 'cancel':
        await jobQueue.cancelJob(jobId);
        return NextResponse.json({
          success: true,
          message: 'Job cancelled successfully',
        });

      case 'retry':
        await jobQueue.retryJob(jobId);
        return NextResponse.json({
          success: true,
          message: 'Job queued for retry',
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: cancel, retry' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in job action API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}