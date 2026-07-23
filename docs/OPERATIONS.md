# Hướng dẫn vận hành và triển khai

## 1. Nguyên tắc an toàn

- Không chạy lệnh xóa recursive trong `/var/www`.
- Không restart toàn server.
- Không sửa hoặc restart backend dùng chung và stack `ominilab.vatli365.vn`.
- Chỉ dùng các service có tiền tố `thukyso-`.
- Luôn chạy `nginx -t` trước khi reload Nginx.
- Không mở PostgreSQL, Redis hoặc cổng `3020` ra Internet.
- Không đưa `.env`, token, private key hoặc Google Client Secret vào Git/chat.
- Mỗi lần chỉ triển khai một phase.
- Trước migration phải kiểm tra đúng database `thukyso`.

## 2. Bố cục production

```text
/var/www/thukyso.vatli365.vn/
├── .nvm/
├── .secrets/
│   └── postgres_password
└── app/
    ├── .env
    ├── apps/
    ├── packages/
    ├── prisma/
    └── infrastructure/
```

Quyền:

- User/group ứng dụng: `thukyso`.
- `.env`: owner `thukyso`, mode `600`.
- Nginx chỉ được quyền traverse thư mục gốc và đọc static build.
- Nginx không được đọc `.env`.

## 3. Thành phần đang dùng

- Node riêng qua NVM: Node 22.
- pnpm: phiên bản khóa trong `package.json`.
- PostgreSQL: database và role `thukyso`.
- Redis: database `1`, prefix `thukyso`.
- API: `127.0.0.1:3020`.
- Nginx: frontend static và proxy `/api/`.
- SSL: Certbot/Let's Encrypt.

## 4. Kiểm tra nhanh

```bash
systemctl is-active nginx postgresql redis-server thukyso-api thukyso-worker
```

```bash
curl -sS https://thukyso.vatli365.vn/api/v1/health
```

Kết quả health bình thường:

```json
{"status":"ok","database":"up","redis":"up"}
```

Kiểm tra cổng:

```bash
ss -lntp | grep -E ':(3020|3021)\b'
```

Kiểm tra repository:

```bash
sudo -u thukyso -H git -C /var/www/thukyso.vatli365.vn/app status --short --branch
```

## 5. Quy trình cập nhật mã an toàn

Không chạy quy trình này nếu phase mới yêu cầu secret nhưng `.env` chưa được cập nhật.

```bash
sudo -u thukyso -H git -C /var/www/thukyso.vatli365.vn/app pull --ff-only
```

```bash
sudo -u thukyso -H bash -c 'cd /var/www/thukyso.vatli365.vn/app; export NVM_DIR="$HOME/.nvm"; source "$NVM_DIR/nvm.sh"; pnpm install --frozen-lockfile'
```

```bash
sudo -u thukyso -H bash -c 'cd /var/www/thukyso.vatli365.vn/app; export NVM_DIR="$HOME/.nvm"; source "$NVM_DIR/nvm.sh"; pnpm prisma:generate'
```

Kiểm tra migration trước:

```bash
sudo -u thukyso -H bash -c 'cd /var/www/thukyso.vatli365.vn/app; export NVM_DIR="$HOME/.nvm"; source "$NVM_DIR/nvm.sh"; ./node_modules/.bin/prisma migrate status'
```

Áp dụng migration:

```bash
sudo -u thukyso -H bash -c 'cd /var/www/thukyso.vatli365.vn/app; export NVM_DIR="$HOME/.nvm"; source "$NVM_DIR/nvm.sh"; pnpm prisma:deploy'
```

Chạy kiểm tra:

```bash
sudo -u thukyso -H bash -c 'cd /var/www/thukyso.vatli365.vn/app; export NVM_DIR="$HOME/.nvm"; source "$NVM_DIR/nvm.sh"; pnpm check'
```

Chỉ sau khi các bước trên thành công:

```bash
systemctl restart thukyso-api
```

Nếu worker thay đổi:

```bash
systemctl restart thukyso-worker
```

Sau restart:

```bash
systemctl status thukyso-api --no-pager --full
```

```bash
curl -sS -i https://thukyso.vatli365.vn/api/v1/health
```

## 6. Log

API:

```bash
journalctl -u thukyso-api -n 100 --no-pager
```

Worker:

```bash
journalctl -u thukyso-worker -n 100 --no-pager
```

Nginx:

```text
/var/log/nginx/thukyso.vatli365.vn.access.log
/var/log/nginx/thukyso.vatli365.vn.error.log
```

Không dán log lên chat nếu log vô tình chứa cookie, OAuth code hoặc token.

## 7. Nginx và SSL

Template versioned:

```text
infrastructure/nginx/thukyso.vatli365.vn.conf
```

Sau khi thay đổi:

```bash
nginx -t
```

Nếu hợp lệ:

```bash
systemctl reload nginx
```

Kiểm tra tự gia hạn:

```bash
certbot renew --dry-run
```

## 8. Rollback mã nguồn

Không dùng `git reset --hard` trên production.

Nếu bản mới lỗi:

1. Không chạy thêm migration ngược bằng tay.
2. Ghi lại commit hiện tại và log lỗi.
3. Dùng một commit revert mới trên repository phát triển.
4. Pull commit revert bằng `--ff-only`.
5. Build/test lại rồi restart riêng service bị ảnh hưởng.

Migration database phải dùng migration bù, không chỉnh trực tiếp migration đã áp dụng.

## 9. Backup cần bổ sung

Trước khi có dữ liệu thật cần hoàn thiện:

- Backup PostgreSQL mỗi ngày.
- Giữ tối thiểu 7 bản.
- Kiểm thử restore định kỳ.
- Theo dõi dung lượng đĩa.
- Không backup `.env` vào nơi công khai.
- Mã hóa bản backup nếu chứa dữ liệu nghiệp vụ.
