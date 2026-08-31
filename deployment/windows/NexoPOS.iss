#define MyAppName "NexoPOS"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "NexoPOS"

[Setup]
AppId={{D43391CB-44EA-4AC8-BE68-93F3F58B4D45}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\NexoPOS
DefaultGroupName=NexoPOS
OutputDir=dist
OutputBaseFilename=NexoPOS-Setup-x64
Compression=lzma2/max
SolidCompression=yes
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=admin
WizardStyle=modern
DisableProgramGroupPage=yes
UninstallDisplayIcon={app}\runtime\node.exe

[Files]
Source: "package\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autodesktop}\NexoPOS"; Filename: "{app}\runtime-scripts\open-nexopos.cmd"; WorkingDir: "{app}"
Name: "{group}\NexoPOS"; Filename: "{app}\runtime-scripts\open-nexopos.cmd"; WorkingDir: "{app}"
Name: "{group}\Respaldar ahora"; Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\runtime-scripts\backup-nexopos.ps1"" -InstallDir ""{app}"""

[Run]
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\install.ps1"" -InstallDir ""{app}"" -CustomerName ""{code:GetCustomerName}"" -AdminEmail ""{code:GetAdminEmail}"" -AdminPassword ""{code:GetAdminPassword}"""; Flags: runhidden waituntilterminated
Filename: "{app}\runtime-scripts\open-nexopos.cmd"; Description: "Abrir NexoPOS"; Flags: postinstall nowait skipifsilent

[UninstallRun]
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\uninstall.ps1"" -InstallDir ""{app}"""; Flags: runhidden waituntilterminated

[Code]
var CustomerPage, AdminPage: TInputQueryWizardPage;
procedure InitializeWizard;
begin
  CustomerPage := CreateInputQueryPage(wpSelectDir, 'Cliente', 'Identificación de esta instalación', 'Indica el nombre comercial del cliente.');
  CustomerPage.Add('Nombre del cliente:', False);
  AdminPage := CreateInputQueryPage(CustomerPage.ID, 'Administrador', 'Credenciales iniciales', 'Define el correo y una contraseña de al menos 12 caracteres.');
  AdminPage.Add('Correo:', False);
  AdminPage.Add('Contraseña:', True);
end;
function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;
  if (CurPageID = CustomerPage.ID) and (Length(Trim(CustomerPage.Values[0])) < 2) then begin MsgBox('Escribe el nombre del cliente.', mbError, MB_OK); Result := False; end;
  if (CurPageID = AdminPage.ID) and ((Pos('@', AdminPage.Values[0]) = 0) or (Length(AdminPage.Values[1]) < 12)) then begin MsgBox('Correo inválido o contraseña menor de 12 caracteres.', mbError, MB_OK); Result := False; end;
end;
function GetCustomerName(Param: String): String; begin Result := CustomerPage.Values[0]; end;
function GetAdminEmail(Param: String): String; begin Result := AdminPage.Values[0]; end;
function GetAdminPassword(Param: String): String; begin Result := AdminPage.Values[1]; end;
