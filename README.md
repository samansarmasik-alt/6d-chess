# 6D Chess - Hiper-Boyutlu Güvenli Çok Oyunculu Satranç

Bu proje, kendi bilgisayarınızda (PC) çalıştırıp arkadaşlarınızla tamamen **IP adresinizi gizleyerek** güvenle online oynayabileceğiniz, modern glassmorphic arayüze sahip 6 boyutlu (6D) gelişmiş bir satranç oyunudur. 

Oyun başlangıcında hamle sırası ve renk ataması **görsel bir Yazı-Tura kurası (Coin Flip)** ile belirlenir. Klasik kuralların yanı sıra Portal, Kuantum Süperpozisyonu ve Yerçekimi gibi eğlenceli ve heyecan verici modlar içerir.

---

## 🛡️ IP Adresi Nasıl Gizlenir? (Güvenlik Altyapısı)

Geleneksel eşler arası (P2P) bağlantı kuran WebRTC oyunları, oyuncuların gerçek dış IP adreslerini birbirlerine sızdırabilir. 

Bu oyunda **Client-Server (İstemci-Sunucu) mimarisi** kullanılmıştır:
- Bütün oyun trafiği ve oyuncu hamleleri merkezi **Node.js (Socket.io) sunucusu** üzerinden yönlendirilir.
- Siz ve rakibiniz sadece sunucuya bağlanırsınız. Oyuncular arasında doğrudan bir veri akışı olmadığı için **IP adresiniz diğer oyuncular tarafından hiçbir şekilde tespit edilemez**.
- Sunucuyu kendi bilgisayarınızda çalıştırıp dışarıya açtığınızda veya ücretsiz bulut servislerine yüklediğinizde, arkadaşlarınız sadece sunucu adresini görür.

---

## 🚀 Kurulum ve Çalıştırma

Oyunu kendi PC'nizde çalıştırmak oldukça basittir. Bilgisayarınızda [Node.js](https://nodejs.org/) kurulu olmalıdır.

### 1. Bağımlılıkları Yükleyin
Proje klasörünün (`six_d_chess`) içerisinde bir terminal/komut satırı açın ve şu komutu çalıştırın:
```bash
npm install
```

### 2. Sunucuyu Başlatın
Sunucuyu yerel olarak çalıştırmak için:
```bash
npm start
```
Sunucu başarıyla başladığında terminalde şu çıktı belirecektir:
```text
=============================================
  6D Chess server is running!
  Local Address: http://localhost:3000
  IP is fully protected via Socket.io relay!
=============================================
```
Artık tarayıcınızdan `http://localhost:3000` adresine girerek oyunu yerel ağda oynayabilirsiniz.

---

## 🌍 Arkadaşlarınızla Online Oynamak İçin Dışarıya Açma

Oyunu kendi bilgisayarınızda çalıştırırken, modeminize port açma işlemi yapmadan ve **IP adresinizi tamamen gizli tutarak** arkadaşınızla internet üzerinden oynamak için şu güvenli yöntemleri kullanabilirsiniz:

### Yöntem A: Ngrok Tünelleme (En Hızlısı)
[Ngrok](https://ngrok.com/), yerel sunucunuzu güvenli bir proxy üzerinden dış dünyaya açar.
1. Ngrok'u indirin ve kurun.
2. Terminale şu komutu yazarak 3000 portunu dışarı açın:
   ```bash
   ngrok http 3000
   ```
3. Ngrok size `https://xxxx-xx-xx.ngrok-free.app` şeklinde güvenli bir web adresi verecektir. 
4. Bu bağlantıyı arkadaşınıza gönderin. Arkadaşınız bu adrese girdiğinde sizin sunucunuza bağlanacak ve güvenle oynayabileceksiniz.

### Yöntem B: Ücretsiz Bulut Sunucuya Yükleme (Kalıcı ve Pratik)
Oyun dosyalarını hiçbir ücret ödemeden ve 1 dakika içinde internete yükleyebilirsiniz:
1. Kodları **GitHub**'a yükleyin.
2. [Render](https://render.com/) veya [Railway](https://railway.app/) gibi ücretsiz platformlara ücretsiz üye olun.
3. GitHub deposunu bağlayıp web servisi olarak deploy edin (Başlangıç komutu: `npm start`).
4. Servis size kalıcı bir `https://six-d-chess.onrender.com` bağlantısı verecektir. Hem siz hem arkadaşınız bu adrese girerek oynayabilirsiniz.

---

## 🌌 6D Satranç Boyutları Nasıl Çalışır?

Oyundaki tahtalar `[X, Y, Z, W, V, U]` koordinat sistemiyle tanımlanır:
1. **X (Genişlik)**: Standart tahta sütunları.
2. **Y (Yükseklik)**: Standart tahta satırları.
3. **Z (Katman - 3D)**: Üst üste binen tahta katmanları (Uzay ekseni).
4. **W (Zaman - 4D)**: Paralel zaman çizgileri / zaman tünelleri.
5. **V (Evren - 5D)**: Paralel evrenler arası derinlik.
6. **U (Gerçeklik - 6D)**: Alternatif boyutlar / gerçeklik dalları.

### Taşların Hareket Matematiği:
* **Kale (Rook)**: Sadece tek bir eksende (örn: sadece X, sadece Z veya sadece U ekseninde) istediği kadar doğrusal hareket edebilir.
* **Fil (Bishop)**: Tam olarak iki eksende aynı anda eşit miktarda hareket edebilir (Çift boyutlu çapraz geçiş). Örneğin: `1 birim X` ve `1 birim W (Zaman)` ekseninde aynı anda ilerleyebilir.
* **Vezir (Queen)**: Herhangi bir sayıda eksende aynı anda eşit miktarda ilerleyebilir (Hiper boyutlu süper vezir).
* **Şah (King)**: Herhangi bir yöne veya eksene doğru sadece `1 adım` atabilir.
* **At (Knight)**: Herhangi iki eksende `2'ye 1` oranında sıçrayabilir (örn: X ekseninde 2 adım, V ekseninde 1 adım). Aradaki engellerin üzerinden atlar.
* **Piyon (Pawn)**: Kendi yerel tahtasında `Y` ekseninde ileriye doğru adım atar. Saldırı yaparken ise `Y` ekseninde 1 ileri giderken **diğer herhangi bir eksende** (Z katmanı, W zamanı vb.) 1 birim yana geçebilir (Katmanlar arası çapraz saldırı!).

---

## 🎨 Eğlenceli Oyun Modları

1. **Klasik Mod**: Boyutlar arası standart kurallarla oynanan saf 6D akıl oyunudur.
2. **Portal Geçiş Modu**: Her tahtanın sol alt `[0,0]` köşesi ile sağ üst `[W-1, H-1]` köşesinde solucan delikleri bulunur. Portala giren bir taş otomatik olarak diğer portal çıkışına ışınlanır!
3. **Kuantum Modu**: Sıra sizdeyken bir taşınızı **Kuantum Süperpozisyonu** yaparak aynı anda iki farklı hedef kareye yerleştirebilirsiniz! Taş yarı saydam görünür. Rakip taş o karelerden birine saldırdığında veya siz o taşla başka bir hamle yapmaya kalkıştığınızda kuantum çöküşü (Coin Flip) tetiklenir ve taşın gerçek konumu kesinleşir.
4. **Yerçekimi Modu**: `Z` ekseni dikey yüksekliği simüle eder. Bir taşın zemin katmanın üzerinde durabilmesi için (`z > 0`), tam altındaki hücrede (`z - 1`) destekleyici bir başka taş (dost ya da düşman) bulunmalıdır. Destek çekilirse taş yerçekimiyle aşağı katmanlara düşer!

---

## 🎲 Yazı-Tura Kurası (Coin Flip)

Oyun lobi ekranında her iki oyuncu da yerini aldığında, Host "Oyunu Başlat" butonuna tıklar.
* Sunucu, güvenli bir şekilde rastgeleliği hesaplar ve her iki istemciye **Yazı-Tura** sonucunu gönderir.
* Ekranda muhteşem neon kıvılcımlarla **3 boyutlu dönen altın bir madeni para** belirir.
* Para döndükten sonra Heads (Yazı) veya Tails (Tura) üzerine düşerek beyaz taşı ve ilk hamle yapma hakkını kazanan oyuncuyu ilan eder.
* Kura animasyonunun ardından lobi kapanır ve hiper uzay tahtaları aktif hale gelir!
