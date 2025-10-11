# generate_normal_data.py

import pandas as pd
import numpy as np
from datetime import datetime, timedelta

def generate_trip(start_lat, start_lon, end_lat, end_lon, num_points, start_time, avg_speed_kmh, noise_level=0.0001):
    """
    Generates a realistic GPS trajectory between two points with noise.
    """
    # Create a straight line path between start and end points
    lats = np.linspace(start_lat, end_lat, num_points)
    lons = np.linspace(start_lon, end_lon, num_points)

    # Add random noise to make the path look more natural
    lats += np.random.normal(0, noise_level, num_points)
    lons += np.random.normal(0, noise_level, num_points)
    
    # Estimate total trip time based on a simple distance approximation and average speed
    total_dist_approx = np.sqrt((end_lat - start_lat)**2 + (end_lon - start_lon)**2) * 111 
    duration_hours = total_dist_approx / avg_speed_kmh
    duration_seconds = duration_hours * 3600
    
    # Create timestamps with slight variations
    time_deltas = np.linspace(0, duration_seconds, num_points)
    timestamps = [start_time + timedelta(seconds=int(td + np.random.uniform(-5, 5))) for td in time_deltas]
    
    df = pd.DataFrame({
        'latitude': lats,
        'longitude': lons,
        'timestamp': timestamps
    })
    
    return df

if __name__ == "__main__":
    print("🚀 Generating realistic 'normal' GPS data for training...")
    
    start_of_day = datetime(2025, 9, 21, 10, 0, 0) # Start at 10:00 AM

    # --- Trip 1: A short walk around the Gateway of India ---
    print("    -> Simulating Trip 1: Walking near Gateway of India...")
    trip1 = generate_trip(
        start_lat=18.9220, start_lon=72.8347,  # Gateway of India
        end_lat=18.9235, end_lon=72.8355,    # A nearby point
        num_points=50,
        start_time=start_of_day,
        avg_speed_kmh=5, # Walking speed
        noise_level=0.0003
    )

    # --- Trip 2: A taxi ride from Bandra to Juhu ---
    print("    -> Simulating Trip 2: Taxi from Bandra to Juhu...")
    trip2_start_time = trip1['timestamp'].iloc[-1] + timedelta(minutes=30)
    trip2 = generate_trip(
        start_lat=19.0544, start_lon=72.8406,  # Bandra
        end_lat=19.1076, end_lon=72.8263,    # Juhu Beach
        num_points=150,
        start_time=trip2_start_time,
        avg_speed_kmh=25, # City driving speed
        noise_level=0.0008
    )
    
    # Combine all trips into one DataFrame
    full_trip_df = pd.concat([trip1, trip2], ignore_index=True).sort_values(by='timestamp')

    # Add the other columns to match the required format
    full_trip_df['is_valid_alt'] = 0
    full_trip_df['altitude_in_feet'] = 492 # Placeholder
    full_trip_df['data_field'] = 0 # Placeholder
    full_trip_df['date'] = full_trip_df['timestamp'].dt.strftime('%Y-%m-%d')
    full_trip_df['time'] = full_trip_df['timestamp'].dt.strftime('%H:%M:%S')
    
    # Final column order
    final_df = full_trip_df[['latitude', 'longitude', 'is_valid_alt', 'altitude_in_feet', 'data_field', 'date', 'time']]
    
    # Save to CSV
    output_filename = 'normal_gps_data.csv'
    final_df.to_csv(output_filename, index=False)
    
    print(f"\n✅ Successfully generated {len(final_df)} data points.")
    print(f"✅ Data saved to '{output_filename}'. You can now use this file to retrain your model.")