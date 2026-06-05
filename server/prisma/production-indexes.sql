CREATE UNIQUE INDEX IF NOT EXISTS uq_active_bookings_hall_date
ON bookings(hall_id, booking_date)
WHERE status IN ('UPCOMING','COMPLETED');
