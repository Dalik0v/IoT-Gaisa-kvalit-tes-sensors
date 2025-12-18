// ============================================
// IoT Air Quality Sensor - iPhone Hotspot Version
// ESP32 + SCD41 Sensor
// 6 LED Scale (3 Blue + 3 Red)
// ============================================

#include <Wire.h>
#include <SparkFun_SCD4x_Arduino_Library.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>

SCD4x scd;

// ============================================
// WiFi Settings - iPhone Hotspot
// ============================================
const char* ssid = "iPhone (Danila)";     
const char* password = "123456789";         
const char* serverHost = "api.danilanet.id.lv";

// ============================================
// Hardware Configuration
// ============================================

// I2C pins for SCD41 sensor (ESP32 default)
const int SDA_PIN = 21;
const int SCL_PIN = 22;

// LED Configuration - 6 LED Scale for Air Quality
// Blue LEDs (Good air quality - levels 1-3)
const int BLUE[3] = {13, 12, 14};
// Red LEDs (Bad air quality - levels 4-6)  
const int RED[3]  = {27, 25, 32};

// All 6 LEDs in order (Blue 1,2,3 then Red 1,2,3)
// Level 1 = 1 blue LED (excellent)
// Level 2 = 2 blue LEDs (good)
// Level 3 = 3 blue LEDs (ok)
// Level 4 = 3 blue + 1 red (moderate - ventilate)
// Level 5 = 3 blue + 2 red (poor - open window!)
// Level 6 = 3 blue + 3 red (bad - leave room!)

// Status LED - System status blink
const int STATUS_PIN = 4;

// ============================================
// CO2 Thresholds for 6 levels
// ============================================
// Level 1: < 400 ppm   - Excellent (outdoors)
// Level 2: 400-600 ppm - Good
// Level 3: 600-800 ppm - OK, normal indoor
// Level 4: 800-1000 ppm - Moderate, should ventilate
// Level 5: 1000-1500 ppm - Poor, open window!
// Level 6: > 1500 ppm - Bad, leave room!

const int CO2_LEVEL_1 = 400;   // 1 blue
const int CO2_LEVEL_2 = 600;   // 2 blue
const int CO2_LEVEL_3 = 800;   // 3 blue
const int CO2_LEVEL_4 = 1000;  // 3 blue + 1 red
const int CO2_LEVEL_5 = 1500;  // 3 blue + 2 red
// > 1500 = level 6      // 3 blue + 3 red

// ============================================
// System Variables
// ============================================

bool sensorOk = false;

// Data sending interval (10 seconds)
unsigned long lastSend = 0;
const unsigned long SEND_INTERVAL = 10000;

// Status LED blink control
unsigned long blinkMs = 1000, lastBlink = 0;
bool statusOn = false;

// WiFi reconnection
unsigned long lastWiFiCheck = 0;
const unsigned long WIFI_CHECK_INTERVAL = 30000;

// ============================================
// Helper Functions
// ============================================

// Get ESP32 MAC address
String getMacAddress() {
    uint8_t mac[6];
    WiFi.macAddress(mac);
    char macStr[18];
    sprintf(macStr, "%02X:%02X:%02X:%02X:%02X:%02X", 
            mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
    return String(macStr);
}

// ============================================
// LED Control - 6 Level Scale
// ============================================

// Set LED scale based on level (1-6)
// Level 1: 🔵⚫⚫⚫⚫⚫ - Excellent
// Level 2: 🔵🔵⚫⚫⚫⚫ - Good
// Level 3: 🔵🔵🔵⚫⚫⚫ - OK
// Level 4: 🔵🔵🔵🔴⚫⚫ - Moderate (ventilate!)
// Level 5: 🔵🔵🔵🔴🔴⚫ - Poor (open window!)
// Level 6: 🔵🔵🔵🔴🔴🔴 - Bad (leave room!)

void setAirQualityLevel(int level) {
  // Clamp level to 1-6
  if (level < 1) level = 1;
  if (level > 6) level = 6;
  
  // Set Blue LEDs (always on for levels 1-3, all on for 4-6)
  if (level <= 3) {
    // Level 1-3: light up 1, 2, or 3 blue LEDs
    for (int i = 0; i < 3; i++) {
      digitalWrite(BLUE[i], (i < level) ? HIGH : LOW);
    }
    // All red LEDs off
    for (int i = 0; i < 3; i++) {
      digitalWrite(RED[i], LOW);
    }
  } else {
    // Level 4-6: all blue LEDs on, plus 1, 2, or 3 red LEDs
    for (int i = 0; i < 3; i++) {
      digitalWrite(BLUE[i], HIGH);
    }
    // Light up red LEDs based on level (4=1red, 5=2red, 6=3red)
    int redCount = level - 3;
    for (int i = 0; i < 3; i++) {
      digitalWrite(RED[i], (i < redCount) ? HIGH : LOW);
    }
  }
}

// Convert CO2 value to level (1-6)
int co2ToLevel(int co2) {
  if (co2 < CO2_LEVEL_1) return 1;  // Excellent (< 400)
  if (co2 < CO2_LEVEL_2) return 2;  // Good (400-600)
  if (co2 < CO2_LEVEL_3) return 3;  // OK (600-800)
  if (co2 < CO2_LEVEL_4) return 4;  // Moderate (800-1000)
  if (co2 < CO2_LEVEL_5) return 5;  // Poor (1000-1500)
  return 6;                          // Bad (> 1500)
}

// Get level description for Serial output
String getLevelDescription(int level) {
  switch(level) {
    case 1: return "EXCELLENT - Fresh air!";
    case 2: return "GOOD - Nice air quality";
    case 3: return "OK - Normal indoor";
    case 4: return "MODERATE - Time to ventilate";
    case 5: return "POOR - Open window!";
    case 6: return "BAD - Leave the room!";
    default: return "UNKNOWN";
  }
}

// Set status LED blink speed based on level
void setBlinkByLevel(int level) {
  switch(level) {
    case 1:
    case 2:
      blinkMs = 2000;  // Very slow - all good
      break;
    case 3:
      blinkMs = 1000;  // Slow - ok
      break;
    case 4:
      blinkMs = 500;   // Medium - attention
      break;
    case 5:
      blinkMs = 250;   // Fast - warning
      break;
    case 6:
      blinkMs = 100;   // Very fast - danger!
      break;
    default:
      blinkMs = 1000;
  }
}

// Update status LED blink
void tickBlink() {
  unsigned long now = millis();
  if (now - lastBlink >= blinkMs) {
    lastBlink = now;
    statusOn = !statusOn;
    digitalWrite(STATUS_PIN, statusOn ? HIGH : LOW);
  }
}

// ============================================
// WiFi Connection
// ============================================

void connectWiFi() {
  Serial.println("=================================");
  Serial.println("Connecting to iPhone Hotspot...");
  Serial.print("Network: ");
  Serial.println(ssid);
  Serial.println("=================================");
  
  WiFi.disconnect(true);
  delay(1000);
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(500);
    Serial.print(".");
    digitalWrite(STATUS_PIN, attempts % 2 == 0 ? HIGH : LOW);
    attempts++;
  }
  
  Serial.println();
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("=================================");
    Serial.println("WiFi CONNECTED!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("Signal (RSSI): ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
    
    Serial.println("=================================");
    Serial.print(">>> MAC Address: ");
    Serial.println(getMacAddress());
    Serial.println("=================================");
    Serial.println("Copy this MAC to register device!");
    Serial.println("=================================");
    
    digitalWrite(STATUS_PIN, HIGH);
    delay(2000);
    digitalWrite(STATUS_PIN, LOW);
    
  } else {
    Serial.println("WiFi CONNECTION FAILED!");
    Serial.println("1. Check Personal Hotspot is ON");
    Serial.println("2. Check hotspot name: " + String(ssid));
    Serial.println("3. Keep iPhone screen ON");
    
    for (int i = 0; i < 15; i++) {
      digitalWrite(STATUS_PIN, HIGH);
      delay(100);
      digitalWrite(STATUS_PIN, LOW);
      delay(100);
    }
  }
}

void checkWiFiConnection() {
  unsigned long now = millis();
  if (now - lastWiFiCheck >= WIFI_CHECK_INTERVAL) {
    lastWiFiCheck = now;
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("WiFi disconnected! Reconnecting...");
      connectWiFi();
    }
  }
}

// ============================================
// Data Sending
// ============================================

void sendDataToServer(int co2, float temp, float humidity) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Cannot send - WiFi not connected!");
    return;
  }
  
  float oxygen = 20.9 - (co2 - 400) * 0.001;
  if (oxygen < 19.0) oxygen = 19.0;
  if (oxygen > 21.0) oxygen = 21.0;
  
  float particles = humidity * 0.3;
  
  String macAddr = getMacAddress();
  
  String jsonData = "{";
  jsonData += "\"device_id\":\"" + macAddr + "\",";
  jsonData += "\"oxygen\":" + String(oxygen, 2) + ",";
  jsonData += "\"co2\":" + String(co2) + ",";
  jsonData += "\"particles\":" + String(particles, 1);
  if (temp > 0) {
    jsonData += ",\"temperature\":" + String(temp, 1);
  }
  if (humidity > 0) {
    jsonData += ",\"humidity\":" + String(humidity, 1);
  }
  jsonData += "}";
  
  Serial.println("\n--- Sending Data ---");
  Serial.print("CO2: "); Serial.print(co2); Serial.println(" ppm");
  Serial.print("Temp: "); Serial.print(temp, 1); Serial.println(" C");
  Serial.print("Humidity: "); Serial.print(humidity, 1); Serial.println(" %");
  
  WiFiClientSecure client;
  client.setInsecure();
  
  HTTPClient http;
  String url = "https://" + String(serverHost) + "/api/measurements";
  
  http.setTimeout(15000);
  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  
  int httpCode = http.POST(jsonData);
  
  if (httpCode > 0) {
    if (httpCode == 200 || httpCode == 201) {
      Serial.println("SUCCESS - Data sent!");
    } else {
      Serial.print("Server error: ");
      Serial.println(httpCode);
    }
  } else {
    Serial.print("HTTP Error: ");
    Serial.println(http.errorToString(httpCode));
  }
  
  http.end();
  Serial.println("--------------------");
}

// ============================================
// Setup
// ============================================

void setup() {
  Serial.begin(115200);
  delay(500);
  
  Serial.println();
  Serial.println("============================================");
  Serial.println("  IoT Air Quality Sensor");
  Serial.println("  6 LED Scale Version");
  Serial.println("  Blue(1-3) = Good | Red(4-6) = Bad");
  Serial.println("============================================");

  // Initialize LED pins
  for (int i = 0; i < 3; i++) {
    pinMode(BLUE[i], OUTPUT);
    digitalWrite(BLUE[i], LOW);
    pinMode(RED[i], OUTPUT);
    digitalWrite(RED[i], LOW);
  }
  pinMode(STATUS_PIN, OUTPUT);
  digitalWrite(STATUS_PIN, LOW);

  // LED test - show all 6 levels
  Serial.println("Testing LED scale...");
  for (int level = 1; level <= 6; level++) {
    Serial.print("Level ");
    Serial.print(level);
    Serial.print(": ");
    Serial.println(getLevelDescription(level));
    setAirQualityLevel(level);
    delay(500);
  }
  
  // Turn off all LEDs
  for (int i = 0; i < 3; i++) {
    digitalWrite(BLUE[i], LOW);
    digitalWrite(RED[i], LOW);
  }
  delay(300);
  
  Serial.println("LED test complete!");

  // Connect to WiFi
  connectWiFi();

  // Initialize I2C for SCD41
  Wire.begin(SDA_PIN, SCL_PIN);
  Wire.setClock(100000);
  delay(100);

  // Initialize sensor
  Serial.println("Initializing SCD41 sensor...");
  bool ok = scd.begin(Wire);
  Serial.print("scd.begin() -> ");
  Serial.println(ok ? "OK" : "FAIL");

  if (!ok) {
    sensorOk = false;
    Serial.println("Sensor not found - using simulation!");
    return;
  }
  sensorOk = true;

  Serial.println("Waiting for first measurement:");
  for (int i = 5; i > 0; i--) {
    Serial.print(i);
    Serial.println("...");
    delay(1000);
  }

  Serial.println();
  Serial.println("CO2(ppm) | Temp(C) | Hum(%) | Level | Status");
  Serial.println("---------|---------|--------|-------|------------------");
}

// ============================================
// Main Loop
// ============================================

void loop() {
  checkWiFiConnection();
  
  // Simulation mode
  if (!sensorOk) {
    Serial.println("SIMULATION MODE");
    
    int co2 = 400 + random(-50, 800);  // Random 350-1200 ppm
    float temp = 22.0 + random(-20, 20) / 10.0;
    float humidity = 45.0 + random(-100, 100) / 10.0;
    
    int level = co2ToLevel(co2);
    
    Serial.print("CO2: "); Serial.print(co2); Serial.print(" ppm | ");
    Serial.print("Level: "); Serial.print(level); Serial.print(" | ");
    Serial.println(getLevelDescription(level));
    
    setAirQualityLevel(level);
    setBlinkByLevel(level);
    
    sendDataToServer(co2, temp, humidity);
    
    tickBlink();
    delay(10000);
    return;
  }

  // Read real sensor
  if (scd.readMeasurement()) {
    uint16_t co2Raw = scd.getCO2();
    float t = scd.getTemperature();
    float h = scd.getHumidity();
    int co2 = (int)co2Raw;

    if (co2 > 0 && co2 < 5000) {
      int level = co2ToLevel(co2);
      
      setAirQualityLevel(level);
      setBlinkByLevel(level);

      // Log to serial
      Serial.print(co2);
      Serial.print("     | ");
      Serial.print(t, 1);
      Serial.print("   | ");
      Serial.print(h, 1);
      Serial.print("  | ");
      Serial.print(level);
      Serial.print("     | ");
      Serial.println(getLevelDescription(level));
      
      // Send data at interval
      unsigned long now = millis();
      if (now - lastSend >= SEND_INTERVAL) {
        lastSend = now;
        sendDataToServer(co2, t, h);
      }
    } else {
      Serial.println("Invalid CO2 reading");
    }
  }

  tickBlink();
  delay(500);
}
