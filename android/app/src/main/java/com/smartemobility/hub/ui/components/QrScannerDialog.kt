package com.smartemobility.hub.ui.components

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.util.Size
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.core.resolutionselector.ResolutionSelector
import androidx.camera.core.resolutionselector.ResolutionStrategy
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.PhotoLibrary
import androidx.compose.material.icons.filled.QrCode2
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.google.zxing.BarcodeFormat
import com.google.zxing.BinaryBitmap
import com.google.zxing.DecodeHintType
import com.google.zxing.PlanarYUVLuminanceSource
import com.google.zxing.RGBLuminanceSource
import com.google.zxing.common.HybridBinarizer
import com.google.zxing.qrcode.QRCodeReader
import com.google.zxing.qrcode.QRCodeWriter
import com.smartemobility.hub.data.model.QrCodeParser
import com.smartemobility.hub.ui.theme.HubColors
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

@Composable
fun QrScannerDialog(
    expectedVehicleId: String,
    onDismiss: () -> Unit,
    onCodeDecoded: (String) -> Unit
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current

    var hasCameraPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) ==
                PackageManager.PERMISSION_GRANTED
        )
    }
    var scanError by remember { mutableStateOf<String?>(null) }
    var showManualFallback by remember { mutableStateOf(false) }
    var manualCode by remember { mutableStateOf("") }
    var showSampleQr by remember { mutableStateOf(false) }
    val decodedOnce = remember { AtomicBoolean(false) }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { granted ->
        hasCameraPermission = granted
        if (!granted) {
            scanError = "Chưa cấp quyền camera. Bạn có thể chọn ảnh QR từ máy hoặc nhập mã dự phòng."
        }
    }

    val photoPicker = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia()
    ) { uri: Uri? ->
        if (uri != null) {
            val decoded = decodeQrFromUri(context, uri)
            val code = QrCodeParser.extractVehicleCode(decoded)
            if (!code.isNullOrBlank() && decodedOnce.compareAndSet(false, true)) {
                onCodeDecoded(code)
            } else {
                scanError = "Không nhận diện được mã QR hợp lệ trong ảnh đã chọn."
            }
        }
    }

    LaunchedEffect(Unit) {
        if (!hasCameraPermission) {
            permissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            shape = RoundedCornerShape(22.dp),
            color = HubColors.CardSurfaceElevated
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Quét mã QR trên xe",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = HubColors.TextPrimary
                    )
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Filled.Close, contentDescription = "Đóng")
                    }
                }

                Text(
                    text = "Hướng camera vào mã QR gắn trên xe ($expectedVehicleId) để xác nhận nhận xe.",
                    fontSize = 13.sp,
                    color = HubColors.TextSecondary
                )
                Spacer(modifier = Modifier.height(12.dp))

                if (hasCameraPermission && !showSampleQr) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(260.dp)
                            .clip(RoundedCornerShape(16.dp))
                            .background(Color.Black)
                    ) {
                        CameraQrPreview(
                            onQrDetected = { raw ->
                                val code = QrCodeParser.extractVehicleCode(raw)
                                if (!code.isNullOrBlank() && decodedOnce.compareAndSet(false, true)) {
                                    onCodeDecoded(code)
                                }
                            },
                            modifier = Modifier.fillMaxSize()
                        )
                        Box(
                            modifier = Modifier
                                .align(Alignment.Center)
                                .size(170.dp)
                                .border(2.5.dp, HubColors.SkylineHorizonGlow, RoundedCornerShape(16.dp))
                        )
                    }
                } else if (showSampleQr) {
                    val sampleBitmap = remember(expectedVehicleId) {
                        createQrBitmap("emobility://vehicle/$expectedVehicleId")
                    }
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(16.dp))
                            .background(Color.White)
                            .padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        if (sampleBitmap != null) {
                            Image(
                                bitmap = sampleBitmap.asImageBitmap(),
                                contentDescription = "Mã QR mẫu $expectedVehicleId",
                                modifier = Modifier.size(180.dp)
                            )
                        }
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = "Mã QR xe $expectedVehicleId (dùng để quét thử từ thiết bị khác)",
                            fontSize = 12.sp,
                            color = HubColors.TextSecondary,
                            textAlign = TextAlign.Center
                        )
                    }
                } else {
                    Surface(
                        shape = RoundedCornerShape(16.dp),
                        color = HubColors.CardSurface,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(140.dp)
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(16.dp),
                            verticalArrangement = Arrangement.Center,
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(
                                text = "Chưa có quyền Camera để quét trực tiếp.",
                                fontSize = 13.sp,
                                color = HubColors.TextSecondary,
                                textAlign = TextAlign.Center
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Button(
                                onClick = { permissionLauncher.launch(Manifest.permission.CAMERA) },
                                colors = ButtonDefaults.buttonColors(containerColor = HubColors.RoyalBlue)
                            ) {
                                Text("Cấp quyền Camera")
                            }
                        }
                    }
                }

                if (!scanError.isNullOrBlank()) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = scanError.orEmpty(),
                        color = HubColors.ErrorFg,
                        fontSize = 12.sp
                    )
                }

                Spacer(modifier = Modifier.height(10.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedButton(
                        onClick = {
                            photoPicker.launch(
                                PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                            )
                        },
                        modifier = Modifier.weight(1f)
                    ) {
                        Icon(Icons.Filled.PhotoLibrary, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.size(4.dp))
                        Text("Quét từ ảnh", fontSize = 12.sp)
                    }
                    OutlinedButton(
                        onClick = { showSampleQr = !showSampleQr },
                        modifier = Modifier.weight(1f)
                    ) {
                        Icon(Icons.Filled.QrCode2, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.size(4.dp))
                        Text(if (showSampleQr) "Mở Camera" else "QR xe mẫu", fontSize = 12.sp)
                    }
                }

                TextButton(
                    onClick = { showManualFallback = !showManualFallback },
                    modifier = Modifier.align(Alignment.CenterHorizontally)
                ) {
                    Text(
                        text = if (showManualFallback) "Ẩn nhập mã dự phòng" else "Không quét được? Nhập mã thủ công",
                        fontSize = 12.sp
                    )
                }

                if (showManualFallback) {
                    OutlinedTextField(
                        value = manualCode,
                        onValueChange = { manualCode = it },
                        label = { Text("Mã xe (vd: $expectedVehicleId)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Button(
                        onClick = {
                            val clean = QrCodeParser.extractVehicleCode(manualCode)
                            if (!clean.isNullOrBlank() && decodedOnce.compareAndSet(false, true)) {
                                onCodeDecoded(clean)
                            }
                        },
                        enabled = manualCode.isNotBlank(),
                        colors = ButtonDefaults.buttonColors(containerColor = HubColors.RoyalBlue),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Xác nhận nhận xe")
                    }
                }
            }
        }
    }
}

@Composable
private fun CameraQrPreview(
    onQrDetected: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val executor = remember { Executors.newSingleThreadExecutor() }
    val previewView = remember { PreviewView(context) }

    DisposableEffect(lifecycleOwner, previewView) {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(context)
        val listener = Runnable {
            val cameraProvider = try {
                cameraProviderFuture.get()
            } catch (_: Exception) {
                return@Runnable
            }
            val preview = Preview.Builder().build().also {
                it.surfaceProvider = previewView.surfaceProvider
            }
            val reader = QRCodeReader()
            val hints = mapOf(DecodeHintType.TRY_HARDER to true)

            val analysis = ImageAnalysis.Builder()
                .setResolutionSelector(
                    ResolutionSelector.Builder()
                        .setResolutionStrategy(
                            ResolutionStrategy(
                                Size(960, 720),
                                ResolutionStrategy.FALLBACK_RULE_CLOSEST_HIGHER_THEN_LOWER
                            )
                        )
                        .build()
                )
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .build()
                .also { imageAnalysis ->
                    imageAnalysis.setAnalyzer(executor) { imageProxy ->
                        val text = decodeQrFromImageProxy(reader, hints, imageProxy)
                        imageProxy.close()
                        if (!text.isNullOrBlank()) {
                            ContextCompat.getMainExecutor(context).execute {
                                onQrDetected(text)
                            }
                        }
                    }
                }

            try {
                cameraProvider.unbindAll()
                cameraProvider.bindToLifecycle(
                    lifecycleOwner,
                    CameraSelector.DEFAULT_BACK_CAMERA,
                    preview,
                    analysis
                )
            } catch (_: Exception) {
                // Emulator or device without rear camera falls back to image picker/manual
            }
        }
        cameraProviderFuture.addListener(listener, ContextCompat.getMainExecutor(context))
        onDispose {
            try {
                cameraProviderFuture.get().unbindAll()
            } catch (_: Exception) {
            }
            executor.shutdown()
        }
    }

    AndroidView(
        factory = { previewView },
        modifier = modifier
    )
}

private fun decodeQrFromImageProxy(
    reader: QRCodeReader,
    hints: Map<DecodeHintType, Any>,
    imageProxy: ImageProxy
): String? {
    val plane = imageProxy.planes.firstOrNull() ?: return null
    val buffer = plane.buffer
    val bytes = ByteArray(buffer.remaining())
    buffer.get(bytes)

    val width = imageProxy.width
    val height = imageProxy.height
    val rowStride = plane.rowStride

    val yData = if (rowStride == width) {
        bytes
    } else {
        ByteArray(width * height).also { out ->
            for (row in 0 until height) {
                val srcOffset = row * rowStride
                if (srcOffset + width <= bytes.size) {
                    System.arraycopy(bytes, srcOffset, out, row * width, width)
                }
            }
        }
    }

    return try {
        val source = PlanarYUVLuminanceSource(yData, width, height, 0, 0, width, height, false)
        val bitmap = BinaryBitmap(HybridBinarizer(source))
        reader.decode(bitmap, hints).text
    } catch (_: Exception) {
        null
    } finally {
        reader.reset()
    }
}

private fun decodeQrFromUri(context: Context, uri: Uri): String? {
    val bitmap = context.contentResolver.openInputStream(uri)?.use { stream ->
        BitmapFactory.decodeStream(stream)
    } ?: return null

    val width = bitmap.width
    val height = bitmap.height
    val pixels = IntArray(width * height)
    bitmap.getPixels(pixels, 0, width, 0, 0, width, height)

    val reader = QRCodeReader()
    return try {
        val source = RGBLuminanceSource(width, height, pixels)
        val binary = BinaryBitmap(HybridBinarizer(source))
        reader.decode(binary, mapOf(DecodeHintType.TRY_HARDER to true)).text
    } catch (_: Exception) {
        null
    } finally {
        bitmap.recycle()
    }
}

fun createQrBitmap(content: String, sizePx: Int = 512): Bitmap? {
    return try {
        val matrix = QRCodeWriter().encode(content, BarcodeFormat.QR_CODE, sizePx, sizePx)
        val pixels = IntArray(sizePx * sizePx) { index ->
            val x = index % sizePx
            val y = index / sizePx
            if (matrix[x, y]) android.graphics.Color.BLACK else android.graphics.Color.WHITE
        }
        Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.ARGB_8888).apply {
            setPixels(pixels, 0, sizePx, 0, 0, sizePx, sizePx)
        }
    } catch (_: Exception) {
        null
    }
}
