CREATE UNIQUE INDEX IF NOT EXISTS "Booking_active_hall_date_key"
ON "Booking"("hallId", "date")
WHERE "cancelled" = false;
