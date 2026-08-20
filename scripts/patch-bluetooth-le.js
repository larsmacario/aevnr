import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pluginSwiftPath = path.resolve(
  __dirname,
  "../node_modules/@capacitor-community/bluetooth-le/ios/Sources/BluetoothLe/Plugin.swift"
);

if (fs.existsSync(pluginSwiftPath)) {
  let content = fs.readFileSync(pluginSwiftPath, "utf8");
  const target = 'let companyIdentifier = dataObject["companyIdentifier"] as? UInt16';
  const replacement =
    'let companyIdentifier = (dataObject["companyIdentifier"] as? Int).flatMap({ UInt16(exactly: $0) }) ?? (dataObject["companyIdentifier"] as? NSNumber).map({ UInt16($0.uint16Value) })';
  if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(pluginSwiftPath, content, "utf8");
    console.log("✔ Patched @capacitor-community/bluetooth-le for Swift 6");
  }
}
