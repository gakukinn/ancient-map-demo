$imagePath = "c:\Users\GAKU\Desktop\MAPWAR\public\assets\soldier.png"

try {
    Add-Type -AssemblyName System.Drawing
    $img = [System.Drawing.Image]::FromFile($imagePath)
    
    $width = $img.Width
    $height = $img.Height
    $frameWidth = $width / 3
    $ratio = $frameWidth / $height
    
    Write-Host "Total Width: $width"
    Write-Host "Total Height: $height"
    Write-Host "Single Frame Width: $frameWidth"
    Write-Host "Single Frame Ratio: $([math]::Round($ratio, 2))"
    
    $img.Dispose()
} catch {
    Write-Host "Error: $_"
}
