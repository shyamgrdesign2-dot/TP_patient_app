import { distanceKm } from "../config/brand.js";
export function verifyArrival(
  appointment,
  hospital,
  position,
  today,
  now = Date.now(),
) {
  if (!appointment || appointment.status !== "Confirmed")
    throw new Error("Select a confirmed appointment.");
  if (appointment.type !== "In-person")
    throw new Error("Online consultations do not need hospital check-in.");
  if (appointment.date !== today)
    throw new Error("Check-in is available on the day of your appointment.");
  if (
    !hospital ||
    !Number.isFinite(hospital.lat) ||
    !Number.isFinite(hospital.lng)
  )
    throw new Error(
      "The hospital location is not configured. Please check in at reception.",
    );
  const { lat, lng, accuracy, timestamp } = position || {};
  if (
    ![lat, lng, accuracy, timestamp].every(Number.isFinite) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180 ||
    accuracy < 0 ||
    Math.abs(now - timestamp) > 120000
  )
    throw new Error("Get a fresh location reading to check in.");
  if (accuracy > 100)
    throw new Error(
      "Your location is not accurate enough. Move to an open area and try again, or check in at reception.",
    );
  const metres = distanceKm({ lat, lng }, hospital) * 1000;
  if (metres + accuracy > (hospital.checkInRadiusMeters || 250))
    throw new Error(
      "You appear to be away from this hospital. Check in when you arrive, or ask reception for help.",
    );
  return true;
}
export function locateForCheckIn() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation)
      return reject(
        new Error("Location is unavailable. Please check in at reception."),
      );
    navigator.geolocation.getCurrentPosition(
      (result) =>
        resolve({
          lat: result.coords.latitude,
          lng: result.coords.longitude,
          accuracy: result.coords.accuracy,
          timestamp: result.timestamp,
        }),
      (error) =>
        reject(
          new Error(
            error.code === 1
              ? "Allow location access to check in, or visit reception."
              : "Could not determine your location. Try again or check in at reception.",
          ),
        ),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 12000 },
    );
  });
}
