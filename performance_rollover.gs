// =====================================================
// CONFIG - Update setiap bulan
// =====================================================
const MONDASH_ID    = '[ID_SPREADSHEET_MONDASH]';
const MONDASH_SHEET = 'Performance';
const SOURCE_MONTH  = '08'; // bulan sumber (2 digit)
const TARGET_MONTH  = '09'; // bulan target (2 digit)

const REGIONS = [
  { name: 'Region_A', sourceId: '[ID_FOLDER_08_REGION_A]', targetId: '[ID_FOLDER_09_REGION_A]' },
  { name: 'Region_B', sourceId: '[ID_FOLDER_08_REGION_B]', targetId: '[ID_FOLDER_09_REGION_B]' },
  { name: 'Region_C', sourceId: '[ID_FOLDER_08_REGION_C]', targetId: '[ID_FOLDER_09_REGION_C]' },
  { name: 'Region_D', sourceId: '[ID_FOLDER_08_REGION_D]', targetId: '[ID_FOLDER_09_REGION_D]' },
  { name: 'Region_E', sourceId: '[ID_FOLDER_08_REGION_E]', targetId: '[ID_FOLDER_09_REGION_E]' },
];

// =====================================================
// MAIN
// =====================================================
function rolloverAllRegions() {
  const sheet = SpreadsheetApp.openById(MONDASH_ID).getSheetByName(MONDASH_SHEET);
  const data  = sheet.getDataRange().getValues();

  const tlcRowMap = {};
  for (let i = 0; i < data.length; i++) {
    const tlc = data[i][0]?.toString().trim();
    if (tlc && tlc !== 'TLC') tlcRowMap[tlc] = i + 1;
  }
  Logger.log('Total TLC di Mondash: ' + Object.keys(tlcRowMap).length);

  const targetMonthLabel = getTargetMonthLabel();
  const colIndex = findColumnIndex(data, targetMonthLabel);
  if (colIndex === -1) {
    Logger.log('ERROR: Kolom tidak ditemukan: ' + targetMonthLabel);
    return;
  }
  Logger.log("Kolom target '" + targetMonthLabel + "': kolom " + (colIndex + 1));

  let totalCopied = 0, totalSkipped = 0, totalNoMatch = 0;
  const failedPermissions = [];

  REGIONS.forEach(region => {
    Logger.log('== Region: ' + region.name + ' ==');
    let sourceFolder, targetFolder;
    try {
      sourceFolder = DriveApp.getFolderById(region.sourceId);
      targetFolder = DriveApp.getFolderById(region.targetId);
    } catch (e) {
      Logger.log('ERROR folder: ' + region.name + ' | ' + e.message);
      return;
    }

    const files = sourceFolder.getFiles();
    while (files.hasNext()) {
      const file = files.next();
      if (file.getMimeType() !== MimeType.GOOGLE_SHEETS) continue;
      const oldName = file.getName();
      if (!oldName.startsWith(SOURCE_MONTH + ' ')) continue;

      const newName = TARGET_MONTH + ' ' + oldName.slice(SOURCE_MONTH.length + 1);
      const tlc = newName.slice(TARGET_MONTH.length + 1).trim();

      // Skip if already exists (safe to re-run)
      if (targetFolder.getFilesByName(newName).hasNext()) {
        Logger.log('Skip (sudah ada): ' + newName);
        totalSkipped++; continue;
      }

      const copiedFile = file.makeCopy(newName, targetFolder);
      const permFailed = copyPermissions(file, copiedFile);
      if (permFailed.length > 0)
        failedPermissions.push({ file: newName, emails: permFailed });

      const url = copiedFile.getUrl();
      Logger.log('Copied: ' + newName + ' | ' + url);
      totalCopied++;

      if (!tlcRowMap[tlc]) {
        Logger.log('WARNING: TLC tidak ditemukan di Mondash: ' + tlc);
        totalNoMatch++; continue;
      }
      sheet.getRange(tlcRowMap[tlc], colIndex + 1).setValue(url);
      Logger.log('Mondash updated: ' + tlc + ' -> row ' + tlcRowMap[tlc]);
    }
  });

  Logger.log('==========================');
  Logger.log('SELESAI');
  Logger.log('Total copied  : ' + totalCopied);
  Logger.log('Total skipped : ' + totalSkipped);
  Logger.log('Total no match: ' + totalNoMatch);
  Logger.log('Permission    : ' + (failedPermissions.length === 0 ? 'semua berhasil' : failedPermissions.length + ' gagal'));
  Logger.log('==========================');
}

// =====================================================
// HELPERS
// =====================================================
function copyPermissions(sourceFile, targetFile) {
  const targetFileId = targetFile.getId();
  const failedEmails = [];

  sourceFile.getEditors().forEach(user => {
    if (retryPermission('writer', user.getEmail(), targetFileId))
      failedEmails.push(user.getEmail());
  });
  sourceFile.getViewers().forEach(user => {
    if (retryPermission('reader', user.getEmail(), targetFileId))
      failedEmails.push(user.getEmail());
  });

  try {
    targetFile.setSharing(sourceFile.getSharingAccess(), sourceFile.getSharingPermission());
  } catch (e) {
    Logger.log('Gagal copy link sharing: ' + e.message);
  }
  return failedEmails;
}

function retryPermission(role, email, fileId, maxRetry = 3) {
  for (let i = 1; i <= maxRetry; i++) {
    try {
      Drive.Permissions.create(
        { role, type: 'user', emailAddress: email },
        fileId,
        { sendNotificationEmail: false }
      );
      return false;
    } catch (e) {
      if (i < maxRetry) Utilities.sleep(2000);
    }
  }
  return true;
}

function findColumnIndex(data, headerName) {
  for (let i = 0; i < data.length; i++)
    for (let j = 0; j < data[i].length; j++)
      if (data[i][j]?.toString().trim().toLowerCase() === headerName.toLowerCase()) return j;
  return -1;
}

function getTargetMonthLabel() {
  const monthMap = {
    '01':'jan','02':'feb','03':'mar','04':'apr',
    '05':'mei','06':'jun','07':'jul','08':'agust',
    '09':'sept','10':'okt','11':'nov','12':'des'
  };
  return (monthMap[TARGET_MONTH] || TARGET_MONTH) + '-26';
}

function debugAllFolders() {
  Logger.log('Akun aktif: ' + Session.getActiveUser().getEmail());
  REGIONS.forEach(r => {
    try { Logger.log('OK Source ' + r.name + ': ' + DriveApp.getFolderById(r.sourceId).getName()); }
    catch(e) { Logger.log('GAGAL Source ' + r.name + ': ' + e.message); }
    try { Logger.log('OK Target ' + r.name + ': ' + DriveApp.getFolderById(r.targetId).getName()); }
    catch(e) { Logger.log('GAGAL Target ' + r.name + ': ' + e.message); }
  });
}
