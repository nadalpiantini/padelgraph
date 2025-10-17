import { NextResponse } from 'next/server';
// import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    // const supabase = await createClient();

    // TODO: Implement actual rankings logic from tournaments
    // For now, return mock data that matches the expected structure
    const mockPlayers = [
      {
        id: '1',
        name: 'Carlos Martinez',
        rank: 1,
        points: 2450,
        change: '+23',
        level: 'pro' as const,
      },
      {
        id: '2',
        name: 'Ana Rodriguez',
        rank: 2,
        points: 2380,
        change: '+15',
        level: 'pro' as const,
      },
      {
        id: '3',
        name: 'Miguel Santos',
        rank: 3,
        points: 2290,
        change: '+8',
        level: 'advanced' as const,
      },
    ];

    return NextResponse.json({
      players: mockPlayers.slice(0, limit),
      total: mockPlayers.length,
    });

    // TODO: Replace with actual database query when rankings system is ready
    // const { data, error } = await supabase
    //   .from('rankings')
    //   .select('*')
    //   .order('points', { ascending: false })
    //   .limit(limit);

    // if (error) throw error;

    // return NextResponse.json({
    //   players: data,
    //   total: data.length,
    // });
  } catch (error) {
    console.error('Error fetching rankings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rankings' },
      { status: 500 }
    );
  }
}
