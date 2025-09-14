import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Mock attestation data - in production, this would come from your TEE environment
    const mockAttestationReport = {
      tee_tcb_svn: "06010300000000000000000000000000",
      mr_seam: "5b38e33a6487958b72c3c12a938eaa5e3fd4510c51aeeab58c7d5ecee41d7c436489d6c8e4f92f160b7cad34207b00c1",
      mr_signer_seam: "000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
      seam_attributes: "0000000000000000",
      td_attributes: "0000001000000000",
      xfam: "e702060000000000",
      mr_td: "c68518a0ebb42136c12b2275164f8c72f25fa9a34392228687ed6e9caeb9c0f1dbd895e9cf475121c029dc47e70e91fd",
      mr_config_id: "000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
      mr_owner: "000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
      mr_owner_config: "000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
      rt_mr0: "85e0855a6384fa1c8a6ab36d0dcbfaa11a5753e5a070c08218ae5fe872fcb86967fd2449c29e22e59dc9fec998cb6547",
      rt_mr1: "9b43f9f34a64bc7191352585be0da1774a1499e698ba77cbf6184547d53d1770d6524c1cfa00b86352f273fc272a8cfe",
      rt_mr2: "7cc2dadd5849bad220ab122c4fbf25a74dc91cc12702447d3b5cac0f49b2b139994f5cd936b293e5f0f14dea4262d668",
      rt_mr3: "2c482b5b34f6902293bc203696f407241bfa319d2410a04c604d1021888d6028bf4bd280ff859ee270a0429aac5f0d82",
      report_data: `${Date.now().toString(16).padStart(64, '0')}${Math.random().toString(16).slice(2).padStart(64, '0')}`
    };

    // Generate a mock quote hex (in production, this would be actual TEE quote data)
    const mockQuoteHex = generateMockQuoteHex(mockAttestationReport);

    // Option 1: Return the attestation report directly
    if (req.query.format === 'direct') {
      return res.status(200).json({
        success: true,
        attestation_report: mockAttestationReport,
        quote_hex: mockQuoteHex,
        timestamp: new Date().toISOString(),
        app_info: {
          name: "ETH Tokyo VTuber Chat",
          version: "1.0.0",
          environment: process.env.NODE_ENV || 'development'
        }
      });
    }

    // Option 2: Verify with Phala Cloud (default behavior)
    try {
      const phalaResponse = await verifyWithPhalaCloud(mockQuoteHex);
      
      // Store the attestation result
      await storeAttestationResult(phalaResponse);
      
      return res.status(200).json({
        success: true,
        phala_verification: phalaResponse,
        local_report: mockAttestationReport,
        timestamp: new Date().toISOString(),
        app_info: {
          name: "ETH Tokyo VTuber Chat",
          version: "1.0.0",
          environment: process.env.NODE_ENV || 'development'
        }
      });
    } catch (phalaError) {
      console.error('Phala Cloud verification failed:', phalaError);
      
      // Return local attestation if Phala Cloud fails
      return res.status(200).json({
        success: true,
        warning: "Phala Cloud verification unavailable, returning local attestation",
        local_report: mockAttestationReport,
        quote_hex: mockQuoteHex,
        timestamp: new Date().toISOString(),
        app_info: {
          name: "ETH Tokyo VTuber Chat",
          version: "1.0.0",
          environment: process.env.NODE_ENV || 'development'
        }
      });
    }

  } catch (error) {
    console.error('Attestation error:', error);
    return res.status(500).json({ 
      error: 'Failed to generate attestation report',
      message: error.message 
    });
  }
}

/**
 * Verify attestation quote with Phala Cloud
 */
async function verifyWithPhalaCloud(quoteHex) {
  const response = await fetch('https://cloud-api.phala.network/api/v1/attestations/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      hex: quoteHex
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(`Phala Cloud verification failed: ${response.status} - ${errorData.detail || errorData.error}`);
  }

  return await response.json();
}

/**
 * Generate a mock quote hex string for testing
 * In production, this would be actual TEE quote data
 */
function generateMockQuoteHex(report) {
  // Create a mock quote structure (simplified)
  const mockQuote = {
    header: {
      version: 4,
      ak_type: "ECDSA_P256",
      tee_type: "TEE_TDX",
      qe_vendor: "0x939a7233f79c4ca9940a0db3957f0607",
      user_data: "0x65004f4410967df7fc6a1faf0d9b6fc000000000"
    },
    body: report
  };

  // Convert to hex string (this is a simplified mock)
  const jsonString = JSON.stringify(mockQuote);
  const hexString = Buffer.from(jsonString).toString('hex');
  
  // Add some mock binary data to make it look more like a real quote
  const mockBinaryPrefix = "04000000" + "01".repeat(100); // Mock header
  const mockBinarySuffix = "ff".repeat(50); // Mock signature
  
  return mockBinaryPrefix + hexString + mockBinarySuffix;
}

/**
 * Store attestation result to logs
 */
async function storeAttestationResult(attestationData) {
  try {
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const attestationLogPath = path.join(logsDir, 'attestation_log.json');
    
    let attestationLog = [];
    if (fs.existsSync(attestationLogPath)) {
      try {
        const existingData = fs.readFileSync(attestationLogPath, 'utf8');
        attestationLog = JSON.parse(existingData);
      } catch (e) {
        console.warn('Could not parse existing attestation log, starting fresh');
        attestationLog = [];
      }
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      checksum: attestationData.checksum || null,
      verified: attestationData.quote?.verified || false,
      tee_type: attestationData.quote?.header?.tee_type || 'unknown',
      app_info: {
        name: "ETH Tokyo VTuber Chat",
        version: "1.0.0",
        environment: process.env.NODE_ENV || 'development'
      }
    };

    attestationLog.push(logEntry);

    // Keep only the last 100 entries
    if (attestationLog.length > 100) {
      attestationLog = attestationLog.slice(-100);
    }

    fs.writeFileSync(attestationLogPath, JSON.stringify(attestationLog, null, 2));
    console.log('Attestation result stored to logs');

  } catch (error) {
    console.error('Failed to store attestation result:', error);
  }
}
