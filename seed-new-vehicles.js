const { pool } = require('./db');

const newVehicles = [
    // Cars
    ['Mercedes-AMG GT',     'car',  'Handcrafted twin-turbo V8 brutality cloaked in Stuttgart elegance.',               'amg-gt.jpg',               'amg-gt.html',              165000.00,  '315 km/h'],
    ['Corvette C8',         'car',  'America\'s mid-engine revolution. Exotic performance, unbeatable value.',           'corvette-c8.jpg',          'corvette-c8.html',         65000.00,   '312 km/h'],
    ['McLaren 720S',        'car',  'Carbon-fiber poetry in motion with 710 HP of twin-turbo fury.',                    'mclaren-720s.jpg',         'mclaren-720s.html',        300000.00,  '341 km/h'],
    ['Ferrari F8 Tributo',  'car',  'A tribute to the most powerful V8 in Ferrari\'s storied history.',                 'ferrari-f8.jpg',           'ferrari-f8.html',          280000.00,  '340 km/h'],
    ['Challenger Hellcat',  'car',  '717 HP of supercharged HEMI fury in retro muscle styling.',                        'challenger-hellcat.jpg',   'challenger-hellcat.html',  70000.00,   '326 km/h'],
    // Bikes
    ['Speed Triple 1200',   'bike', 'British streetfighter fury with a triple-cylinder soul.',                          'speed-triple.jpg',         'speed-triple.html',        18500.00,   '260 km/h'],
    ['GSX-R1000',           'bike', 'The iconic Gixxer. Decades of racing dominance in your hands.',                    'gsxr-1000.jpg',            'gsxr-1000.html',           16000.00,   '299 km/h'],
    ['CBR1000RR-R',         'bike', 'Honda\'s MotoGP-derived Fireblade redefines road-legal performance.',              'cbr1000rr.jpg',            'cbr1000rr.html',           28500.00,   '299 km/h'],
    ['Meteor 350',          'bike', 'Royal Enfield\'s easy cruiser built for journeys, not just destinations.',          'meteor-350.jpg',           'meteor-350.html',          2100.00,    '120 km/h'],
    ['Aprilia RSV4',        'bike', 'Italy\'s V4 race weapon with seven World Superbike titles.',                       'aprilia-rsv4.jpg',         'aprilia-rsv4.html',        24000.00,   '305 km/h'],
];

async function seed() {
    try {
        for (const v of newVehicles) {
            const [existing] = await pool.execute('SELECT id FROM vehicles WHERE detail_page = ?', [v[4]]);
            if (existing.length > 0) {
                console.log(`⏩ "${v[0]}" already exists (id: ${existing[0].id}), skipping.`);
                continue;
            }

            const [result] = await pool.execute(
                'INSERT INTO vehicles (name, category, tagline, image_filename, detail_page, price, top_speed) VALUES (?, ?, ?, ?, ?, ?, ?)',
                v
            );
            console.log(`✅ Inserted "${v[0]}" with id: ${result.insertId}`);
        }
        console.log('\n🎉 All new vehicles seeded successfully!');
    } catch (error) {
        console.error('❌ Error seeding vehicles:', error.message);
    } finally {
        process.exit(0);
    }
}

seed();
