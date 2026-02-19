' Create Desktop Shortcut for Smiling Steps
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Get paths
strDesktop = WshShell.SpecialFolders("Desktop")
strCurrentDir = fso.GetParentFolderName(WScript.ScriptFullName)
strShortcut = strDesktop & "\Smiling Steps.lnk"
strTarget = strCurrentDir & "\start-smiling-steps.bat"
strIcon = strCurrentDir & "\client\public\favicon.ico"

' Create shortcut
Set oShortcut = WshShell.CreateShortcut(strShortcut)
oShortcut.TargetPath = strTarget
oShortcut.WorkingDirectory = strCurrentDir
oShortcut.Description = "Start Smiling Steps Application"
oShortcut.IconLocation = strIcon & ",0"
oShortcut.WindowStyle = 1
oShortcut.Save

WScript.Echo "Shortcut created on Desktop!"
WScript.Echo "Icon: " & strIcon
