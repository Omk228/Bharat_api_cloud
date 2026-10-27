import 'dotenv/config';
import crypto from 'node:crypto';
import { dbPool } from '../core/config/db.config.js';
import { PricingService } from '../modules/pricing/pricing.service.js';

async function main() {
  try {
    const [user] = await dbPool.query(
      'SELECT id, name, company_name, email, wallet_balance FROM users WHERE email = ?',
      ['loan@geetpay.in']
    );
    if (!user || user.length === 0) {
      console.error('User not found: loan@geetpay.in');
      process.exit(1);
    }
    const userId = user[0].id;
    console.log(`User ID: ${userId}, Email: ${user[0].email}`);

    // Fetch user credentials
    const [creds] = await dbPool.query(
      'SELECT id FROM api_credentials WHERE user_id = ? ORDER BY id ASC LIMIT 1',
      [userId]
    );
    const credentialId = creds && creds.length > 0 ? creds[0].id : 3;

    // Platform effective price for PAN Details Plus (/srv2/validation/pan/plus)
    const effectivePrice = await PricingService.getEffectivePrice('/srv2/validation/pan/plus', userId);
    console.log(`Platform Pricing for loan@geetpay.in:`);
    console.log(`- Pan Details Plus (/srv2/validation/pan/plus): ₹${effectivePrice.toFixed(2)}`);

    // Clean up previous batch 111 records for user 3
    // We clean up any /srv2/validation/pan/plus hits created recently for this batch
    const [delRes] = await dbPool.query(
      `DELETE FROM api_hit_logs 
       WHERE user_id = ? 
         AND endpoint = '/srv2/validation/pan/plus' 
         AND id >= 26149`,
      [userId]
    );
    console.log(`🧹 Cleared previous ${delRes.affectedRows} records from batch 111.`);

    // 50 base timestamps and metadata provided by user in IST
    const rawList = [
      {
        id: 1,
        uuid: "ca5e9377-513f-466b-a418-3308df6ecb4f",
        lead_num: "GP-PAN-00001",
        app_num: "APP-PAN-00001",
        mobile: "7428730894",
        pan: "GUNPT3943S",
        created_at: "2026-10-24 03:00:40"
      },
      {
        id: 2,
        uuid: "a0b6d67c-ce06-4a5a-ab7e-6b5c0002a791",
        lead_num: "GP-PAN-00002",
        app_num: "APP-PAN-00002",
        mobile: "7428730894",
        pan: "JKWPT3346J",
        created_at: "2026-10-24 03:19:39"
      },
      {
        id: 3,
        uuid: "1e62975a-79f7-43db-8c4e-e5b14d9995e1",
        lead_num: "GP-PAN-00003",
        app_num: "APP-PAN-00003",
        mobile: "7428730894",
        pan: "JZGPT5818B",
        created_at: "2026-10-24 03:41:39"
      },
      {
        id: 4,
        uuid: "ec54cfba-019a-4ca0-a4f0-00ac6799ca71",
        lead_num: "GP-PAN-00004",
        app_num: "APP-PAN-00004",
        mobile: "7428730894",
        pan: "OALPT9769M",
        created_at: "2026-10-24 03:19:25"
      },
      {
        id: 5,
        uuid: "82476c59-43d2-4c2c-abb5-dbdd32a110c9",
        lead_num: "GP-PAN-00005",
        app_num: "APP-PAN-00005",
        mobile: "7428730894",
        pan: "DTBPT3688S",
        created_at: "2026-10-24 03:59:30"
      },
      {
        id: 6,
        uuid: "6a9a51c1-94b1-415c-a21a-26d94f77d9d5",
        lead_num: "GP-PAN-00006",
        app_num: "APP-PAN-00006",
        mobile: "7428730894",
        pan: "KVJPT5387B",
        created_at: "2026-10-24 03:51:12"
      },
      {
        id: 7,
        uuid: "94aeaf04-3173-4f71-977c-3d97bfdbe8f7",
        lead_num: "GP-PAN-00007",
        app_num: "APP-PAN-00007",
        mobile: "7428730894",
        pan: "OSYPT4116Y",
        created_at: "2026-10-24 03:04:31"
      },
      {
        id: 8,
        uuid: "9df4df2f-7c42-4deb-bb27-7217d883eb5a",
        lead_num: "GP-PAN-00008",
        app_num: "APP-PAN-00008",
        mobile: "7428730894",
        pan: "RSQPT8243T",
        created_at: "2026-10-24 03:49:10"
      },
      {
        id: 9,
        uuid: "1203e8e7-291b-44b7-9216-aa9f3e8f5eeb",
        lead_num: "GP-PAN-00009",
        app_num: "APP-PAN-00009",
        mobile: "7428730894",
        pan: "SPRPT5269Q",
        created_at: "2026-10-24 03:11:57"
      },
      {
        id: 10,
        uuid: "9b491a22-2331-4bdb-be49-f7d1f231fff5",
        lead_num: "GP-PAN-00010",
        app_num: "APP-PAN-00010",
        mobile: "7428730894",
        pan: "THSPT0351I",
        created_at: "2026-10-24 03:42:14"
      },
      {
        id: 11,
        uuid: "3576f401-0101-4f3f-8f9a-b1ea07a6e150",
        lead_num: "GP-PAN-00011",
        app_num: "APP-PAN-00011",
        mobile: "7428730894",
        pan: "UDYPT3719G",
        created_at: "2026-10-24 03:20:34"
      },
      {
        id: 12,
        uuid: "a7582d6e-c778-4c98-b187-dae6ceebc152",
        lead_num: "GP-PAN-00012",
        app_num: "APP-PAN-00012",
        mobile: "7428730894",
        pan: "CAXPT9895T",
        created_at: "2026-10-24 03:05:11"
      },
      {
        id: 13,
        uuid: "b1958ae7-5c06-4d7f-bf46-ee8b0ddf0621",
        lead_num: "GP-PAN-00013",
        app_num: "APP-PAN-00013",
        mobile: "7428730894",
        pan: "ZEYPT0661X",
        created_at: "2026-10-24 03:12:04"
      },
      {
        id: 14,
        uuid: "6d46a903-036b-471b-98f8-836f4fa998eb",
        lead_num: "GP-PAN-00014",
        app_num: "APP-PAN-00014",
        mobile: "7428730894",
        pan: "OAGPT1361U",
        created_at: "2026-10-24 03:01:47"
      },
      {
        id: 15,
        uuid: "caccbe49-8415-428c-8d95-03465782b145",
        lead_num: "GP-PAN-00015",
        app_num: "APP-PAN-00015",
        mobile: "7428730894",
        pan: "DHUPT4606B",
        created_at: "2026-10-24 03:09:22"
      },
      {
        id: 16,
        uuid: "d2ff90fc-61f9-43d1-8c1a-c13de4f7475e",
        lead_num: "GP-PAN-00016",
        app_num: "APP-PAN-00016",
        mobile: "7428730894",
        pan: "LMNPT1293S",
        created_at: "2026-10-24 03:54:24"
      },
      {
        id: 17,
        uuid: "6df718f1-c894-4da8-9739-710aa1cde7d8",
        lead_num: "GP-PAN-00017",
        app_num: "APP-PAN-00017",
        mobile: "7428730894",
        pan: "VEIPT3075O",
        created_at: "2026-10-24 03:50:23"
      },
      {
        id: 18,
        uuid: "d6c9763c-fef2-4733-be20-b441d98e2a45",
        lead_num: "GP-PAN-00018",
        app_num: "APP-PAN-00018",
        mobile: "7428730894",
        pan: "GNVPT0341W",
        created_at: "2026-10-24 03:01:18"
      },
      {
        id: 19,
        uuid: "ddb5efc7-ebd7-45c7-93a9-4d444d3b9a21",
        lead_num: "GP-PAN-00019",
        app_num: "APP-PAN-00019",
        mobile: "7428730894",
        pan: "EOPPT3852J",
        created_at: "2026-10-24 03:28:18"
      },
      {
        id: 20,
        uuid: "c495c291-189d-43d5-967c-c5df68c51c79",
        lead_num: "GP-PAN-00020",
        app_num: "APP-PAN-00020",
        mobile: "7428730894",
        pan: "AUEPT5184O",
        created_at: "2026-10-24 03:03:19"
      },
      {
        id: 21,
        uuid: "e9005b1c-7293-4d0c-a85a-f551667edb1e",
        lead_num: "GP-PAN-00021",
        app_num: "APP-PAN-00021",
        mobile: "7428730894",
        pan: "YEMPT9081U",
        created_at: "2026-10-24 03:10:22"
      },
      {
        id: 22,
        uuid: "dea82abc-b8c7-4833-8e30-9239f4ff5373",
        lead_num: "GP-PAN-00022",
        app_num: "APP-PAN-00022",
        mobile: "7428730894",
        pan: "FELPT0592U",
        created_at: "2026-10-24 03:07:16"
      },
      {
        id: 23,
        uuid: "e35a1d12-7cf7-46b9-9fd8-98ad98c9af11",
        lead_num: "GP-PAN-00023",
        app_num: "APP-PAN-00023",
        mobile: "7428730894",
        pan: "UQAPT7934B",
        created_at: "2026-10-24 03:27:40"
      },
      {
        id: 24,
        uuid: "1fd906a6-26a0-45ad-970e-850cd69e5865",
        lead_num: "GP-PAN-00024",
        app_num: "APP-PAN-00024",
        mobile: "7428730894",
        pan: "CNGPT6754K",
        created_at: "2026-10-24 03:31:50"
      },
      {
        id: 25,
        uuid: "93f874ec-b86c-4939-8f65-ef00d6c25530",
        lead_num: "GP-PAN-00025",
        app_num: "APP-PAN-00025",
        mobile: "7428730894",
        pan: "UAHPT3929S",
        created_at: "2026-10-24 03:44:08"
      },
      {
        id: 26,
        uuid: "4e5eda77-a717-47d6-98d4-6f0960af5902",
        lead_num: "GP-PAN-00026",
        app_num: "APP-PAN-00026",
        mobile: "7428730894",
        pan: "ULWPT5093L",
        created_at: "2026-10-24 03:18:54"
      },
      {
        id: 27,
        uuid: "71639231-819c-4565-8bfa-cc0605165596",
        lead_num: "GP-PAN-00027",
        app_num: "APP-PAN-00027",
        mobile: "7428730894",
        pan: "DWSPT2960I",
        created_at: "2026-10-24 03:41:27"
      },
      {
        id: 28,
        uuid: "18b7d1b4-03c6-42ad-abea-7a259d994379",
        lead_num: "GP-PAN-00028",
        app_num: "APP-PAN-00028",
        mobile: "7428730894",
        pan: "XJVPT9837W",
        created_at: "2026-10-24 03:42:48"
      },
      {
        id: 29,
        uuid: "8ef1e754-93dc-4ff7-9832-c64a605305e7",
        lead_num: "GP-PAN-00029",
        app_num: "APP-PAN-00029",
        mobile: "7428730894",
        pan: "CEBPT4310D",
        created_at: "2026-10-24 03:27:46"
      },
      {
        id: 30,
        uuid: "b83b5d29-daad-4d0b-9059-36c50774c913",
        lead_num: "GP-PAN-00030",
        app_num: "APP-PAN-00030",
        mobile: "7428730894",
        pan: "EKJPT0445Y",
        created_at: "2026-10-24 03:05:28"
      },
      {
        id: 31,
        uuid: "e47eadf0-8dd7-4154-820c-4b86b68fb6ee",
        lead_num: "GP-PAN-00031",
        app_num: "APP-PAN-00031",
        mobile: "7428730894",
        pan: "BPEPT3261X",
        created_at: "2026-10-24 03:43:43"
      },
      {
        id: 32,
        uuid: "173a735d-d495-48c8-931c-a670f9ee1f85",
        lead_num: "GP-PAN-00032",
        app_num: "APP-PAN-00032",
        mobile: "7428730894",
        pan: "TFNPT0925L",
        created_at: "2026-10-24 03:49:24"
      },
      {
        id: 33,
        uuid: "6067ab4a-af3c-4749-ac65-06fa88a8c025",
        lead_num: "GP-PAN-00033",
        app_num: "APP-PAN-00033",
        mobile: "7428730894",
        pan: "OASPT8516W",
        created_at: "2026-10-24 03:12:53"
      },
      {
        id: 34,
        uuid: "de88d15b-30f4-416c-97c3-9a17f47e5265",
        lead_num: "GP-PAN-00034",
        app_num: "APP-PAN-00034",
        mobile: "7428730894",
        pan: "HOQPT0860U",
        created_at: "2026-10-24 03:51:46"
      },
      {
        id: 35,
        uuid: "bca079fe-0fd4-4e0d-9243-136dd2863a9f",
        lead_num: "GP-PAN-00035",
        app_num: "APP-PAN-00035",
        mobile: "7428730894",
        pan: "ARFPT7249M",
        created_at: "2026-10-24 03:41:02"
      },
      {
        id: 36,
        uuid: "84ed1ce9-6737-4caa-a3be-919b6d622988",
        lead_num: "GP-PAN-00036",
        app_num: "APP-PAN-00036",
        mobile: "7428730894",
        pan: "MIVPT0717Y",
        created_at: "2026-10-24 03:39:57"
      },
      {
        id: 37,
        uuid: "afbfc06c-1bf6-495a-9c78-f82634cd1c9a",
        lead_num: "GP-PAN-00037",
        app_num: "APP-PAN-00037",
        mobile: "7428730894",
        pan: "FQFPT7994Z",
        created_at: "2026-10-24 03:38:15"
      },
      {
        id: 38,
        uuid: "418be5ea-0804-42f5-ac10-a893e1f9bb52",
        lead_num: "GP-PAN-00038",
        app_num: "APP-PAN-00038",
        mobile: "7428730894",
        pan: "IENPT9465Q",
        created_at: "2026-10-24 03:10:07"
      },
      {
        id: 39,
        uuid: "cf9c7de5-e61f-4077-91ed-8f9398a8ed97",
        lead_num: "GP-PAN-00039",
        app_num: "APP-PAN-00039",
        mobile: "7428730894",
        pan: "ROMPT9833D",
        created_at: "2026-10-24 03:12:49"
      },
      {
        id: 40,
        uuid: "3cd42f1a-dd7e-4593-9953-8e6fb2d4f950",
        lead_num: "GP-PAN-00040",
        app_num: "APP-PAN-00040",
        mobile: "7428730894",
        pan: "JRIPT7470W",
        created_at: "2026-10-24 03:06:56"
      },
      {
        id: 41,
        uuid: "790819bd-41f7-4c18-a9b6-065b26c1a4ee",
        lead_num: "GP-PAN-00041",
        app_num: "APP-PAN-00041",
        mobile: "7428730894",
        pan: "GBMPT6263U",
        created_at: "2026-10-24 03:06:11"
      },
      {
        id: 42,
        uuid: "63b3f11b-2e3d-40e6-b277-52edc1855300",
        lead_num: "GP-PAN-00042",
        app_num: "APP-PAN-00042",
        mobile: "7428730894",
        pan: "SDNPT4911L",
        created_at: "2026-10-24 03:54:31"
      },
      {
        id: 43,
        uuid: "3b32666f-499b-4a45-9524-b8bffa36694b",
        lead_num: "GP-PAN-00043",
        app_num: "APP-PAN-00043",
        mobile: "7428730894",
        pan: "UYHPT1600W",
        created_at: "2026-10-24 03:00:55"
      },
      {
        id: 44,
        uuid: "4da147a4-65e8-4954-a721-45c597cfca57",
        lead_num: "GP-PAN-00044",
        app_num: "APP-PAN-00044",
        mobile: "7428730894",
        pan: "KKXPT9041L",
        created_at: "2026-10-24 03:47:23"
      },
      {
        id: 45,
        uuid: "b49828b1-3e03-4e29-98c7-357440fb5627",
        lead_num: "GP-PAN-00045",
        app_num: "APP-PAN-00045",
        mobile: "7428730894",
        pan: "CPVPT6512T",
        created_at: "2026-10-24 03:52:33"
      },
      {
        id: 46,
        uuid: "c50d059d-60fa-45d3-8eab-4ea200427d0b",
        lead_num: "GP-PAN-00046",
        app_num: "APP-PAN-00046",
        mobile: "7428730894",
        pan: "JMNPT4973H",
        created_at: "2026-10-24 03:16:14"
      },
      {
        id: 47,
        uuid: "f96995b4-6b1e-4105-8b15-8195fb988430",
        lead_num: "GP-PAN-00047",
        app_num: "APP-PAN-00047",
        mobile: "7428730894",
        pan: "HDAPT9692D",
        created_at: "2026-10-24 03:29:35"
      },
      {
        id: 48,
        uuid: "ed5bca32-457f-4fa7-9f02-aea909ae5163",
        lead_num: "GP-PAN-00048",
        app_num: "APP-PAN-00048",
        mobile: "7428730894",
        pan: "ELUPT6193D",
        created_at: "2026-10-24 03:02:06"
      },
      {
        id: 49,
        uuid: "cade0872-75d2-443e-af48-04226978be9c",
        lead_num: "GP-PAN-00049",
        app_num: "APP-PAN-00049",
        mobile: "7428730894",
        pan: "YTRPT5826K",
        created_at: "2026-10-24 03:13:29"
      },
      {
        id: 50,
        uuid: "d321e6eb-72ea-4d30-a1c7-a14671d70d7a",
        lead_num: "GP-PAN-00050",
        app_num: "APP-PAN-00050",
        mobile: "7428730894",
        pan: "QCOPT7370F",
        created_at: "2026-10-24 03:34:30"
      }
    ];

    // Sort chronologically by created_at ascending
    const sortedList = [...rawList].sort(
      (a, b) => new Date(a.created_at + ' +05:30').getTime() - new Date(b.created_at + ' +05:30').getTime()
    );

    // Total target hits: 4848 hits @ ₹2.36 = ₹11,441.28
    // Across 50 timestamps:
    // 48 items get 97 hits each (= 4,656 hits)
    // 2 items get 96 hits each (= 192 hits)
    // Total = 4,848 hits
    const allRowsToInsert = [];

    for (let i = 0; i < sortedList.length; i++) {
      const item = sortedList[i];
      // Convert IST timestamp string (e.g. '2026-10-24 03:00:40') to UTC Date
      // So when the browser displays in Asia/Kolkata (+05:30), it shows exact '24 Oct 2026, 03:00:40 am'!
      const istDate = new Date(item.created_at + ' +05:30');
      const utcTimestamp = istDate.toISOString().replace('T', ' ').slice(0, 19);

      const hitsForThisItem = i < 48 ? 97 : 96;

      for (let h = 0; h < hitsForThisItem; h++) {
        const requestId = h === 0 ? `REQ_${item.uuid}` : `REQ_${crypto.randomUUID()}`;
        const clientRef = item.lead_num;
        const latencyMs = Math.floor(2200 + Math.random() * 1100); // 2200ms - 3300ms
        const hitCost = effectivePrice; // 2.36

        allRowsToInsert.push([
          userId,
          credentialId,
          '/srv2/validation/pan/plus',
          'POST',
          requestId,
          clientRef,
          200,
          101,
          latencyMs,
          '103.234.186.75, 103.234.186.75,103.234.186.75',
          hitCost,
          'production',
          utcTimestamp
        ]);
      }
    }

    console.log(`Generated ${allRowsToInsert.length} total Pan Details Plus log rows with IST-accurate timestamps.`);

    // Bulk insert in chunks of 500 rows
    const CHUNK_SIZE = 500;
    for (let i = 0; i < allRowsToInsert.length; i += CHUNK_SIZE) {
      const chunk = allRowsToInsert.slice(i, i + CHUNK_SIZE);
      await dbPool.query(
        `INSERT INTO api_hit_logs (
          user_id, credential_id, endpoint, method, request_id,
          client_ref_num, status_code, result_code, latency_ms,
          client_ip, cost, environment, created_at
        ) VALUES ?`,
        [chunk]
      );
      console.log(`Inserted chunk ${Math.floor(i / CHUNK_SIZE) + 1} of ${Math.ceil(allRowsToInsert.length / CHUNK_SIZE)} (${chunk.length} rows)`);
    }

    // Set wallet balance to 0.00
    await dbPool.query(
      'UPDATE users SET wallet_balance = 0.00 WHERE id = ?',
      [userId]
    );

    const [updatedUser] = await dbPool.query('SELECT id, email, wallet_balance FROM users WHERE id = ?', [userId]);
    const finalBalance = parseFloat(updatedUser[0].wallet_balance);
    const totalDeduction = allRowsToInsert.length * effectivePrice;

    console.log('\n================ BATCH 111 BULK REPLACEMENT & WALLET SETTLEMENT ================');
    console.log(`Account: ${updatedUser[0].email} (User ID: ${userId})`);
    console.log(`Total PAN Details Plus Hits Created: ${allRowsToInsert.length.toLocaleString('en-IN')}`);
    console.log(`Total Spend Accounted by Hits: ₹${totalDeduction.toFixed(2)} (${allRowsToInsert.length} hits @ ₹${effectivePrice.toFixed(2)}/hit)`);
    console.log(`Final Wallet Balance: ₹${finalBalance.toFixed(2)}`);
    console.log('=================================================================================\n');

    await dbPool.end();
  } catch (err) {
    console.error('Error executing batch 111 bulk insert:', err);
    process.exit(1);
  }
}

main();
