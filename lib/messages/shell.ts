/**
 * Words shared by both apps: the app frame (navigation, account controls,
 * offline notice), common buttons, and loan status names.
 *
 * Writing rules for every message file: say it the way you'd say it to a
 * borrower at the counter. No banking jargon without a plain word next to
 * it. Tagalog uses the English words Filipinos already use every day
 * (GCash, screenshot, balance, loan, due date) instead of rare formal terms.
 */
export const shellEn = {
  "common.cancel": "Cancel",
  "common.save": "Save",
  "common.saveChanges": "Save changes",
  "common.close": "Close",
  "common.delete": "Delete",
  "common.edit": "Edit",
  "common.optional": "(optional)",
  "common.noLogin": "No login",
  "common.loading": "Loading…",

  "lang.label": "Language",
  "lang.en": "English",
  "lang.tl": "Tagalog",

  "theme.dark": "Dark mode",
  "theme.light": "Light mode",
  "theme.toDark": "Switch to dark mode",
  "theme.toLight": "Switch to light mode",

  "install.button": "Install app",
  "install.iosTitle": "Install this app on your iPhone or iPad",
  "install.iosDesc": "On iPhone this takes a few taps in Safari:",
  "install.iosStep1": "Tap the {share} button at the bottom of Safari (the square with an arrow pointing up).",
  "install.iosStep2": "Scroll down and tap {add}.",
  "install.iosStep3": "Tap {addButton} in the top-right corner.",
  "install.share": "Share",
  "install.addToHome": "Add to Home Screen",
  "install.add": "Add",
  "install.gotIt": "Got it",

  "shell.more": "More",
  "shell.closeMenu": "Close menu",
  "shell.logOut": "Log out",
  "shell.signedInAs": "Signed in as {name}",

  "offline.withTime": "You're offline. You're seeing what was saved on {time}. Connect to the internet to see the latest.",
  "offline.noTime": "You're offline. You're seeing the last saved information. Connect to the internet to see the latest.",

  "nav.portalTitle": "My Loans",
  "nav.myLoans": "My Loans",
  "nav.profile": "Profile",

  "nav.adminTitle": "MELCHUB Admin",
  "nav.dashboard": "Dashboard",
  "nav.loans": "Loans",
  "nav.addClient": "Add Client",
  "nav.loanRequests": "Loan Requests",
  "nav.reports": "Reports",
  "nav.receipts": "Payment Receipts",
  "nav.settings": "Settings",

  "admin.noAccessTitle": "This page is for the admin only",
  "admin.noAccessBody": "You're signed in as {name}, which isn't an admin account.",

  "status.pending": "Not started",
  "status.active": "Active",
  "status.paid": "Paid off",
  "status.overdue": "Late",
  "status.defaulted": "Defaulted",
  "status.cancelled": "Cancelled",
} as const;

export const shellTl: Record<keyof typeof shellEn, string> = {
  "common.cancel": "Kanselahin",
  "common.save": "I-save",
  "common.saveChanges": "I-save ang mga pagbabago",
  "common.close": "Isara",
  "common.delete": "Burahin",
  "common.edit": "I-edit",
  "common.optional": "(hindi kailangan)",
  "common.noLogin": "Walang login",
  "common.loading": "Naglo-load…",

  "lang.label": "Wika",
  "lang.en": "English",
  "lang.tl": "Tagalog",

  "theme.dark": "Madilim na kulay",
  "theme.light": "Maliwanag na kulay",
  "theme.toDark": "Gawing madilim ang kulay",
  "theme.toLight": "Gawing maliwanag ang kulay",

  "install.button": "I-install ang app",
  "install.iosTitle": "I-install ang app sa iPhone o iPad mo",
  "install.iosDesc": "Sa iPhone, ilang tap lang ito sa Safari:",
  "install.iosStep1": "I-tap ang {share} button sa ibaba ng Safari (ang kahon na may arrow pataas).",
  "install.iosStep2": "Mag-scroll pababa at i-tap ang {add}.",
  "install.iosStep3": "I-tap ang {addButton} sa kanang itaas.",
  "install.share": "Share",
  "install.addToHome": "Add to Home Screen",
  "install.add": "Add",
  "install.gotIt": "Sige",

  "shell.more": "Iba pa",
  "shell.closeMenu": "Isara ang menu",
  "shell.logOut": "Mag-log out",
  "shell.signedInAs": "Naka-log in bilang {name}",

  "offline.withTime": "Offline ka. Ang nakikita mo ay ang naka-save noong {time}. Kumonekta sa internet para makita ang pinakabago.",
  "offline.noTime": "Offline ka. Ang nakikita mo ay ang huling naka-save. Kumonekta sa internet para makita ang pinakabago.",

  "nav.portalTitle": "Mga Loan Ko",
  "nav.myLoans": "Mga Loan Ko",
  "nav.profile": "Profile",

  "nav.adminTitle": "MELCHUB Admin",
  "nav.dashboard": "Dashboard",
  "nav.loans": "Mga Loan",
  "nav.addClient": "Bagong Client",
  "nav.loanRequests": "Mga Hiling na Loan",
  "nav.reports": "Mga Ulat",
  "nav.receipts": "Mga Resibo ng Bayad",
  "nav.settings": "Settings",

  "admin.noAccessTitle": "Para lang sa admin ang page na ito",
  "admin.noAccessBody": "Naka-log in ka bilang {name}, at hindi ito admin account.",

  "status.pending": "Hindi pa nagsisimula",
  "status.active": "Aktibo",
  "status.paid": "Bayad na",
  "status.overdue": "Huli sa bayad",
  "status.defaulted": "Hindi nabayaran",
  "status.cancelled": "Kinansela",
};
