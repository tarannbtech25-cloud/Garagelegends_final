-- ============================================
-- Garage Legends - Database Schema (5 Tables)
-- Run this script in your MySQL client to set up the database.
-- ============================================

CREATE DATABASE IF NOT EXISTS garage_db;
USE garage_db;

-- ─────────────────────────────────────────────
-- TABLE 1: users
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
-- TABLE 2: vehicles
-- ─────────────────────────────────────────────
DROP TABLE IF EXISTS vehicles;
CREATE TABLE IF NOT EXISTS vehicles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category ENUM('car', 'bike') NOT NULL,
    tagline VARCHAR(500),
    image_filename VARCHAR(255),
    detail_page VARCHAR(255),
    price DECIMAL(12,2) DEFAULT 0.00,
    top_speed VARCHAR(50) DEFAULT 'N/A',
    avg_rating DECIMAL(3,2) DEFAULT 0.00,
    review_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
-- TABLE 3: contacts
-- ─────────────────────────────────────────────
DROP TABLE IF EXISTS contacts;
CREATE TABLE IF NOT EXISTS contacts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    model_interest VARCHAR(255) DEFAULT 'General Inquiry',
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ─────────────────────────────────────────────
-- TABLE 4: test_drive_bookings
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS test_drive_bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    vehicle_id INT NOT NULL,
    preferred_date DATE NOT NULL,
    preferred_time VARCHAR(20) NOT NULL,
    status ENUM('pending', 'confirmed', 'cancelled') DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────
-- TABLE 5: reviews
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    vehicle_id INT NOT NULL,
    rating TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_vehicle (user_id, vehicle_id)
);

-- ─────────────────────────────────────────────
-- TRIGGERS
-- ─────────────────────────────────────────────

-- Trigger: After a new review is inserted, update the vehicle's avg_rating and review_count
DELIMITER //

CREATE TRIGGER after_review_insert
AFTER INSERT ON reviews
FOR EACH ROW
BEGIN
    UPDATE vehicles
    SET avg_rating = (SELECT ROUND(AVG(rating), 2) FROM reviews WHERE vehicle_id = NEW.vehicle_id),
        review_count = (SELECT COUNT(*) FROM reviews WHERE vehicle_id = NEW.vehicle_id)
    WHERE id = NEW.vehicle_id;
END //

-- Trigger: After a review is deleted, recalculate the vehicle's avg_rating and review_count
CREATE TRIGGER after_review_delete
AFTER DELETE ON reviews
FOR EACH ROW
BEGIN
    UPDATE vehicles
    SET avg_rating = COALESCE((SELECT ROUND(AVG(rating), 2) FROM reviews WHERE vehicle_id = OLD.vehicle_id), 0),
        review_count = (SELECT COUNT(*) FROM reviews WHERE vehicle_id = OLD.vehicle_id)
    WHERE id = OLD.vehicle_id;
END //

DELIMITER ;

-- ─────────────────────────────────────────────
-- SEED DATA
-- ─────────────────────────────────────────────

-- Seed vehicles (matching the current hardcoded cards)
INSERT INTO vehicles (name, category, tagline, image_filename, detail_page, price, top_speed) VALUES
('Mustang GT',          'car',  'The definitive American muscle car, packing unparalleled raw V8 power.',           'Mustang.jpg',              'mustang-gt.html',          55000.00,   '250 km/h'),
('BMW M5',              'car',  'German engineering perfection. The ultimate luxury sports sedan.',                  'Bmw m5.jpg',               'bmw-m5.html',              112000.00,  '305 km/h'),
('Aventador',           'car',  'Untamed V12 performance hiding beneath Italian aggressive aircraft styling.',      'Lamborghini aventador.jpg','aventador.html',           420000.00,  '350 km/h'),
('Porsche 911',         'car',  'A timeless silhouette with driving dynamics that remains undefeated.',              'porsche.jpg',              'porsche-911.html',         115000.00,  '310 km/h'),
('Nissan GT-R',         'car',  'Godzilla awakens. Twin-turbo precision that humbles supercars twice its price.',    'nissan-gtr.jpg',           'nissan-gtr.html',          115000.00,  '315 km/h'),
('Audi R8',             'car',  'A naturally-aspirated V10 masterpiece wrapped in Quattro all-wheel grip.',          'audi-r8.jpg',              'audi-r8.html',             195000.00,  '330 km/h'),
('Toyota Supra',        'car',  'The legendary JDM icon reborn with turbocharged inline-six fury.',                  'toyota-supra.jpg',         'toyota-supra.html',        55000.00,   '250 km/h'),
('Mercedes-AMG GT',     'car',  'Handcrafted twin-turbo V8 brutality cloaked in Stuttgart elegance.',               'amg-gt.jpg',               'amg-gt.html',              165000.00,  '315 km/h'),
('Corvette C8',         'car',  'America''s mid-engine revolution. Exotic performance, unbeatable value.',           'corvette-c8.jpg',          'corvette-c8.html',         65000.00,   '312 km/h'),
('McLaren 720S',        'car',  'Carbon-fiber poetry in motion with 710 HP of twin-turbo fury.',                    'mclaren-720s.jpg',         'mclaren-720s.html',        300000.00,  '341 km/h'),
('Ferrari F8 Tributo',  'car',  'A tribute to the most powerful V8 in Ferrari''s storied history.',                 'ferrari-f8.jpg',           'ferrari-f8.html',          280000.00,  '340 km/h'),
('Challenger Hellcat',  'car',  '717 HP of supercharged HEMI fury in retro muscle styling.',                        'challenger-hellcat.jpg',   'challenger-hellcat.html',  70000.00,   '326 km/h'),
('Panigale V4',         'bike', 'MotoGP derived power wrapped in breathtaking Italian design.',                     'Ducati Panigale.jpg',      'ducati-v4.html',           28000.00,   '299 km/h'),
('Continental GT',      'bike', 'A beautifully crafted cafe racer honoring the spirit of the ''60s.',               'GT 650.jpg',               'continental-gt.html',      3200.00,    '160 km/h'),
('Yamaha R1',           'bike', 'A supreme track weapon with a distinct crossplane roar.',                          'Yamaha r1.jpg',            'yamaha-r1.html',           18000.00,   '299 km/h'),
('S1000 RR',            'bike', 'Technological supremacy and terrifying acceleration.',                             's1000 rr.jpg',             'bmw-s1000rr.html',         17500.00,   '299 km/h'),
('Ninja ZX-10R',        'bike', 'Born on the racetrack. Six-time World Superbike champion bloodline.',              'kawasaki-zx10r.jpg',       'kawasaki-zx10r.html',      17000.00,   '299 km/h'),
('Street Bob',          'bike', 'Raw American cruiser attitude with the iconic Milwaukee-Eight rumble.',            'harley-streetbob.jpg',     'harley-streetbob.html',    15500.00,   '183 km/h'),
('KTM Duke 390',        'bike', 'The lightweight streetfighter that punches way above its displacement.',           'ktm-duke390.jpg',          'ktm-duke390.html',         5500.00,    '167 km/h'),
('Speed Triple 1200',   'bike', 'British streetfighter fury with a triple-cylinder soul.',                          'speed-triple.jpg',         'speed-triple.html',        18500.00,   '260 km/h'),
('GSX-R1000',           'bike', 'The iconic Gixxer. Decades of racing dominance in your hands.',                    'gsxr-1000.jpg',            'gsxr-1000.html',           16000.00,   '299 km/h'),
('CBR1000RR-R',         'bike', 'Honda''s MotoGP-derived Fireblade redefines road-legal performance.',              'cbr1000rr.jpg',            'cbr1000rr.html',           28500.00,   '299 km/h'),
('Meteor 350',          'bike', 'Royal Enfield''s easy cruiser built for journeys, not just destinations.',          'meteor-350.jpg',           'meteor-350.html',          2100.00,    '120 km/h'),
('Aprilia RSV4',        'bike', 'Italy''s V4 race weapon with seven World Superbike titles.',                       'aprilia-rsv4.jpg',         'aprilia-rsv4.html',        24000.00,   '305 km/h');

-- Seed a default admin user (password: Garagelegends@2026)
-- The hash below is for 'Garagelegends@2026' using bcrypt with 10 rounds
INSERT INTO users (username, email, password_hash, role) VALUES
('admin', 'taran@garagelegends.com', '$2b$10$ieYM/CyXPsCKf26DiQjec.70TlR3mtuoqpIDxNjFzEnQs/bCUPC9y', 'admin');
Select * from users;
Select * from reviews;
select * from test_drive_bookings;
select * from contacts;
select * from vehicles;