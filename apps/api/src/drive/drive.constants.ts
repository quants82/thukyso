export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
export const DRIVE_FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";
export const DRIVE_OAUTH_STATE_COOKIE = "thukyso_drive_oauth_state";

export const STANDARD_FOLDERS = [
  ["INBOX", "00_VAN_BAN_MOI"],
  ["PROCESSING", "01_DANG_XU_LY"],
  ["REVIEW", "02_CHO_KIEM_TRA"],
  ["ASSIGNED", "03_DA_GIAO_VIEC"],
  ["DRAFT_REPORTS", "04_BAO_CAO_DU_THAO"],
  ["FINAL_REPORTS", "05_BAO_CAO_HOAN_CHINH"],
  ["TEMPLATES", "06_BIEU_MAU"],
  ["ARCHIVE", "07_KHO_VAN_BAN"],
  ["ERROR", "99_LOI_XU_LY"]
] as const;
