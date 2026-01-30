Add-Type -AssemblyName System.Drawing
$b = [System.Drawing.Bitmap]::FromFile('C:/Users/GAKU/.gemini/antigravity/brain/3a407963-2972-40b8-9208-f8f7cdac0b94/uploaded_image_1766476057864.png')
$p = $b.GetPixel(50, 50)
Write-Host "R: $($p.R) G: $($p.G) B: $($p.B)"
