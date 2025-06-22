import { NextResponse } from 'next/server';
// Assuming src/lib/supabase/client.js exports a server-compatible createClient
import { createClient } from '@/lib/supabase/client'; 

// Helper function to extract block information from plotIdentifier
function extractBlok(plotIdentifier) {
  if (!plotIdentifier || typeof plotIdentifier !== 'string') return null;
  const trimmedId = plotIdentifier.trim();

  // Rule 1: If plotIdentifier contains '-', take the part before the first '-'. (e.g., "A-01" -> "A")
  const hyphenIndex = trimmedId.indexOf('-');
  if (hyphenIndex !== -1) {
    return trimmedId.substring(0, hyphenIndex).trim();
  }

  // Rule 2: If plotIdentifier starts with "Blok " (case-insensitive), take up to the second word.
  // (e.g., "Blok C No 5" -> "Blok C")
  if (trimmedId.toLowerCase().startsWith('blok ')) {
    const parts = trimmedId.split(' ');
    if (parts.length >= 2) {
      return `${parts[0]} ${parts[1]}`;
    }
    return parts[0]; // Should be "Blok" if only "Blok" was provided
  }
  
  // Rule 3: Fallback: first "word" (sequence of non-space characters).
  // (e.g. "Alpha1" -> "Alpha1", "C01" -> "C01")
  const firstWord = trimmedId.split(' ')[0];
  return firstWord; 
}

export async function GET(request) {
  // Initialize Supabase client
  // As per prompt, using createClient from src/lib/supabase/client.js
  // This client needs to be suitable for server-side (Route Handler) execution.
  const supabase = createClient(); 

  const { searchParams } = new URL(request.url);

  const nama = searchParams.get('nama');
  const kp = searchParams.get('kp');
  const plot = searchParams.get('plot');

  console.log('[SEARCH-DEBUG] Request received with params:', { nama, kp, plot });

  // Validate that at least one search parameter is provided
  if (!nama && !kp && !plot) {
    console.log('[SEARCH-DEBUG] No search parameters provided');
    return NextResponse.json(
      { error: 'At least one search parameter must be provided (nama, kp, or plot).' },
      { status: 400 }
    );
  }

  try {
    let query;
    
    if (plot) {
      console.log('[SEARCH-DEBUG] Plot filter detected, using Plot-based query for:', plot);
      // When searching by plot, start from Plot table and join Deceased
      query = supabase
        .from('Plot')
        .select(`
          plotIdentifier,
          status,
          row,
          column,
          Deceased!deceasedId(
            id,
            name,
            icNumber,
            dateOfBirth,
            dateOfDeath,
            gender
          )
        `)
        .ilike('plotIdentifier', `%${plot}%`)
        .not('Deceased', 'is', null); // Only plots with deceased people
        
      // Apply additional filters if provided
      if (nama) {
        console.log('[SEARCH-DEBUG] Adding name filter to plot query:', nama);
        query = query.filter('Deceased.name', 'ilike', `%${nama}%`);
      }
      if (kp) {
        console.log('[SEARCH-DEBUG] Adding IC filter to plot query:', kp);
        query = query.filter('Deceased.icNumber', 'eq', kp);
      }
    } else {
      console.log('[SEARCH-DEBUG] Using Deceased-based query');
      // When not searching by plot, start from Deceased and optionally join Plot
      query = supabase
        .from('Deceased')
        .select(`
          id, 
          name, 
          icNumber, 
          dateOfBirth, 
          dateOfDeath, 
          gender,
          plotId,
          Plot!plotId(plotIdentifier, status, row, column)
        `);

      // Apply filters based on provided query parameters
      if (nama) {
        console.log('[SEARCH-DEBUG] Adding name filter:', nama);
        query = query.ilike('name', `%${nama}%`);
      }
      if (kp) {
        console.log('[SEARCH-DEBUG] Adding IC number filter:', kp);
        query = query.eq('icNumber', kp);
      }
    }

    console.log('[SEARCH-DEBUG] Executing Supabase query...');
    const { data, error: dbError } = await query;
    console.log('[SEARCH-DEBUG] Query result - Data count:', data?.length || 0, 'Error:', dbError?.message || 'none');

    if (dbError) {
      console.error('Supabase query error:', dbError);
      return NextResponse.json(
        { error: 'Error fetching data from the database.', details: dbError.message },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      console.log('[SEARCH-DEBUG] No records found, returning empty array');
      return NextResponse.json([], { status: 200 }); // Return empty array if no records found
    }

    console.log('[SEARCH-DEBUG] Raw data from DB:', JSON.stringify(data, null, 2));

    // Map data to the required output format
    const results = data.map((record, index) => {
      let deceased, plotData;
      
      if (plot) {
        // Plot-based query: record is a Plot with nested Deceased
        deceased = record.Deceased;
        plotData = {
          plotIdentifier: record.plotIdentifier,
          status: record.status,
          row: record.row,
          column: record.column
        };
        console.log(`[SEARCH-DEBUG] Processing plot-based record ${index + 1}:`, {
          plotData: plotData,
          deceased: deceased
        });
      } else {
        // Deceased-based query: record is a Deceased with nested Plot
        deceased = record;
        plotData = record.Plot;
        console.log(`[SEARCH-DEBUG] Processing deceased-based record ${index + 1}:`, {
          deceased_id: deceased.id,
          deceased_name: deceased.name,
          deceased_icNumber: deceased.icNumber,
          deceased_dateOfBirth: deceased.dateOfBirth,
          deceased_dateOfDeath: deceased.dateOfDeath,
          deceased_gender: deceased.gender,
          plotData: plotData
        });
      }
      
      const result = {
        id: deceased.id,
        nama: deceased.name,
        icNumber: deceased.icNumber,
        gender: deceased.gender,
        plotIdentifier: plotData?.plotIdentifier || null,
        plotRow: plotData?.row || null,
        plotColumn: plotData?.column || null,
        plotStatus: plotData?.status || null,
      };
      
      console.log(`[SEARCH-DEBUG] Mapped result ${index + 1}:`, result);
      return result;
    });

    console.log('[SEARCH-DEBUG] Final results being returned:', JSON.stringify(results, null, 2));
    return NextResponse.json(results, { status: 200 });

  } catch (e) {
    // Catch any other unexpected errors
    console.error('API route error:', e);
    return NextResponse.json(
      { error: 'An unexpected error occurred on the server.', details: e.message },
      { status: 500 }
    );
  }
}