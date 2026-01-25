FROM python:3.12-slim

WORKDIR /app

# Install system dependencies and fonts
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    fonts-inter \
    fontconfig \
    && rm -rf /var/lib/apt/lists/* \
    && fc-cache -f -v

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Poppins fonts for OG image generation
COPY fonts/*.ttf /usr/share/fonts/truetype/poppins/
RUN fc-cache -f -v

# Copy application code
COPY . .

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8080

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
